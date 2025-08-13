import { BitfrostTxClient } from '../tx';
import { BitfrostQueryClient } from '../query';

import {
  CanTransferDecision,
  Estimate,
  Logger,
  RegistrySnapshot,
  Timeouts,
  TransferHandle,
  TransferOptions,
  TransferRef,
  TransferRequest,
} from './types';
import { Registry as RegistryService } from './registry';
import { AdaptersMap, AdapterContext, BuiltTx } from './adapters';
import { TransferEvent, Listener } from './events';

import {
  BridgeBlockedError,
  AssetBlockedError,
  AmountTooLowError,
  ChainUnavailableError,
  ChainAssetDirectionBlockedError,
  CanTransferDeclinedError,
  ProviderError,
} from './errors';

import {
  AssetStatus,
  BridgeStatus as ProtoBridgeStatus,
  ChainStatus as ProtoChainStatus,
  inboundTransferStatusToJSON,
  outboundTransferStatusToJSON,
} from '../../generated/int3face/bridge/v1beta1/bridge';

// ———————————————————————————————————————————————————————————————————————————

export class BridgeClient {
  private readonly query: BitfrostQueryClient;
  private readonly tx?: BitfrostTxClient;
  private readonly registry: RegistryService;
  private readonly logger?: Logger;
  private readonly timeouts: Timeouts;
  private readonly adapters: AdaptersMap;
  private readonly poll?: ReturnType<typeof setInterval>;
  private listeners = new Set<Listener>();
  private readonly config: {
    pollIntervalMs?: number;
    network: 'mainnet' | 'testnet';
  };

  private constructor(
    cfg: {
      query: BitfrostQueryClient;
      tx?: BitfrostTxClient;
      logger?: Logger;
      timeouts?: Timeouts;
      adapters?: AdaptersMap;
      pollIntervalMs?: number;
      network: 'mainnet' | 'testnet';
    },
    registry: RegistryService,
  ) {
    this.query = cfg.query;
    this.tx = cfg.tx;
    this.registry = registry;
    this.logger = cfg.logger;
    this.timeouts = cfg.timeouts ?? {};
    this.adapters = cfg.adapters ?? {};
    this.config = { pollIntervalMs: cfg.pollIntervalMs, network: cfg.network };

    const interval = cfg.pollIntervalMs ?? 30_000;
    this.poll = setInterval(() => {
      this.registry.refresh().catch((err) => this.logger?.warn?.('registry refresh failed', err));
    }, interval);
    this.poll?.unref?.();
  }

  static async create(config: {
    query: BitfrostQueryClient;
    tx?: BitfrostTxClient;
    logger?: Logger;
    timeouts?: Timeouts;
    adapters?: AdaptersMap;
    pollIntervalMs?: number;
    network: 'mainnet' | 'testnet';
  }): Promise<BridgeClient> {
    const registry = await RegistryService.create(config.query);
    return new BridgeClient(config, registry);
  }

  destroy(): void {
    if (this.poll) clearInterval(this.poll);
    this.listeners.clear();
  }

  async refresh(): Promise<void> {
    await this.registry.refresh();
  }

  getRegistry(): RegistrySnapshot {
    return this.registry.getSnapshot();
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ————————————————————————————————————————————————————————————————
  // Events (auto ts + correlationId)
  // ————————————————————————————————————————————————————————————————

  private newCorrelationId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
  }

  private emit<K extends TransferEvent['type']>(
    type: K,
    base: Omit<Extract<TransferEvent, { type: K }>, 'type' | 'ts' | 'correlationId'>,
    correlationId: string,
  ): void {
    const evt: Extract<TransferEvent, { type: K }> = {
      type,
      ...base,
      ts: Date.now(),
      correlationId,
    } as Extract<TransferEvent, { type: K }>;
    for (const listener of this.listeners) {
      try {
        listener(evt);
      } catch (e) {
        const err =
          e instanceof ProviderError ? e : new ProviderError('listener threw', { cause: e });
        this.logger?.warn?.('listener threw', err);
      }
    }
  }

  private dispatch(evt: TransferEvent) {
    for (const listener of this.listeners) {
      try {
        listener(evt);
      } catch (e) {
        const err =
          e instanceof ProviderError ? e : new ProviderError('listener threw', { cause: e });
        this.logger?.warn?.('listener threw', err);
      }
    }
  }

  // ————————————————————————————————————————————————————————————————
  // Preflight + RPC CanTransfer
  // ————————————————————————————————————————————————————————————————

  async canTransfer(req: TransferRequest): Promise<CanTransferDecision> {
    const cid = this.newCorrelationId();
    this.emit('onPreflight', { req }, cid);

    const snap = this.registry.getSnapshot();

    // 1) bridge status
    if (snap.bridgeStatus !== ProtoBridgeStatus.BRIDGE_STATUS_OK) {
      const decision: CanTransferDecision = {
        allowed: false,
        reason: new BridgeBlockedError().message,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }

    // 2) asset existence + global asset status
    const asset = snap.assets[req.assetId];
    if (!asset) {
      const decision: CanTransferDecision = {
        allowed: false,
        reason: `asset ${req.assetId} not found`,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }

    if (asset.status !== AssetStatus.ASSET_STATUS_OK) {
      const decision: CanTransferDecision = {
        allowed: false,
        reason: new AssetBlockedError().message,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }

    // 3) chains
    const src = snap.chains[req.fromChainId];
    const dst = snap.chains[req.toChainId];
    if (!src || !dst) {
      const decision: CanTransferDecision = {
        allowed: false,
        reason: new ChainUnavailableError('source or destination chain not found').message,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }

    // 4) chain statuses with directionality
    if (isOutboundBlocked(src.status)) {
      const decision: CanTransferDecision = {
        allowed: false,
        reason: new ChainAssetDirectionBlockedError(
          `source chain ${req.fromChainId} outbound blocked`,
        ).message,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }
    if (isInboundBlocked(dst.status)) {
      const decision: CanTransferDecision = {
        allowed: false,
        reason: new ChainAssetDirectionBlockedError(
          `destination chain ${req.toChainId} inbound blocked`,
        ).message,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }

    // 5) min amount
    const min = asset.minTransferAmount ?? '0';
    try {
      if (BigInt(req.amount) < BigInt(min)) {
        const decision: CanTransferDecision = {
          allowed: false,
          reason: new AmountTooLowError(`min=${min}`).message,
        };
        this.emit('onCanTransfer', { req, decision }, cid);
        return decision;
      }
    } catch {
      const decision: CanTransferDecision = {
        allowed: false,
        reason: new AmountTooLowError('invalid amount').message,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }

    // 6) Online CanTransfer (best effort)
    try {
      const p = this.query.extensions.bridge.canTransfer({
        srcChainId: req.fromChainId,
        destChainId: req.toChainId,
        assetId: req.assetId,
        amount: req.amount,
      });
      const timeout = this.timeouts.canTransferMs ?? 10_000;
      const response = await withTimeout(p, timeout, 'canTransfer timeout');

      const decision: CanTransferDecision = {
        allowed: response.canTransfer,
        reason: response.reason,
      };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    } catch (e) {
      const err =
        e instanceof ProviderError ? e : new ProviderError('canTransfer RPC failed', { cause: e });
      this.logger?.warn?.('canTransfer RPC failed, falling back to local allow', err);
      const decision: CanTransferDecision = { allowed: true };
      this.emit('onCanTransfer', { req, decision }, cid);
      return decision;
    }
  }

  // ————————————————————————————————————————————————————————————————
  // Fee Estimation
  // ————————————————————————————————————————————————————————————————

  async estimate(req: TransferRequest): Promise<Estimate> {
    try {
      const response = await this.query.extensions.fees.estimateFee(
        req.fromChainId,
        req.toChainId,
        parseAssetId(req.assetId),
      );
      return { bridgeFeeRate: response.feeRate };
    } catch {
      return {};
    }
  }

  // ————————————————————————————————————————————————————————————————
  // Execute
  // ————————————————————————————————————————————————————————————————

  async transfer(req: TransferRequest): Promise<{
    built: BuiltTx;
    handle: TransferHandle;
  }> {
    const decision = await this.canTransfer(req);
    if (!decision.allowed) {
      throw new CanTransferDeclinedError(decision.reason ?? 'transfer not allowed');
    }

    const snap = this.registry.getSnapshot();
    const src = snap.chains[req.fromChainId];
    if (!src) throw new ChainUnavailableError('source chain not found');

    const kind = chainTypeToKind(src.type);
    const adapter = this.pickAdapter(kind);
    if (!adapter) throw new ProviderError(`no adapter for kind=${kind}`);

    const adapterCtx: AdapterContext = {
      registry: snap,
      network: this.config.network,
      logger: this.logger,
      timeouts: this.timeouts,
    };

    if (!adapter.canHandle(req.fromChainId, adapterCtx)) {
      throw new ProviderError(`adapter ${kind} cannot handle chain ${req.fromChainId}`);
    }

    const built = await adapter.build(req, adapterCtx);

    const handle: TransferHandle = {
      txId: cryptoRandomId(),
      fromChainId: req.fromChainId,
      toChainId: req.toChainId,
      assetId: req.assetId,
    };

    return { built, handle };
  }

  // ————————————————————————————————————————————————————————————————
  // Track
  // ————————————————————————————————————————————————————————————————

  async *track(ref: TransferRef): AsyncGenerator<TransferEvent> {
    const pollEvery = 3_000;
    const cid = this.newCorrelationId();

    switch (ref.kind) {
      case 'cosmos-tx': {
        for (;;) {
          const tx = await this.query.getTx(ref.txHash!);
          if (tx) {
            if (tx.code !== 0) {
              const evt: TransferEvent = {
                type: 'onFailed',
                error: new ProviderError('tx failed', { tx }),
                ref,
                ts: Date.now(),
                correlationId: cid,
              };
              this.dispatch(evt);
              return;
            }
            const evt: TransferEvent = {
              type: 'onConfirmed',
              ref,
              ts: Date.now(),
              correlationId: cid,
            };
            this.dispatch(evt);
            return;
          }
          await delay(pollEvery);
        }
      }

      case 'bridge-outbound': {
        for (;;) {
          const { outboundTransfer } = await this.query.extensions.bridge.getOutboundTransfer(
            ref.outboundId,
          );

          if (!outboundTransfer) {
            await delay(pollEvery);
            continue;
          }

          const statusStr = outboundTransferStatusToJSON(outboundTransfer.status);

          if (statusStr === 'FAILED' || statusStr === 'UNRECOGNIZED') {
            this.dispatch({
              type: 'onFailed',
              error: new ProviderError(`outbound ${statusStr.toLowerCase()}`, { outboundTransfer }),
              ref,
              ts: Date.now(),
              correlationId: cid,
            });
            return;
          }

          if (statusStr === 'FINALIZED') {
            this.dispatch({
              type: 'onConfirmed',
              ref,
              ts: Date.now(),
              correlationId: cid,
            });
            return;
          }

          await delay(pollEvery);
        }
      }

      case 'bridge-inbound': {
        for (;;) {
          const { inboundTransfer } = await this.query.extensions.bridge.getInboundTransfer(
            ref.inboundId!,
          );

          if (!inboundTransfer) {
            await delay(pollEvery);
            continue;
          }

          const statusStr = inboundTransferStatusToJSON(inboundTransfer.status);

          if (statusStr === 'FINALIZED') {
            this.dispatch({
              type: 'onConfirmed',
              ref,
              ts: Date.now(),
              correlationId: cid,
            });
            return;
          }

          if (statusStr === 'UNRECOGNIZED') {
            this.dispatch({
              type: 'onFailed',
              error: new ProviderError('inbound status UNRECOGNIZED', { inboundTransfer }),
              ref,
              ts: Date.now(),
              correlationId: cid,
            });
            return;
          }

          await delay(pollEvery);
        }
      }

      case 'external': {
        this.logger?.info?.('external tracking is not implemented; delegate to provider');
        return;
      }
    }

    yield* [];
  }

  // ————————————————————————————————————————————————————————————————
  // Adapters
  // ————————————————————————————————————————————————————————————————

  private pickAdapter(kind: ReturnType<typeof chainTypeToKind>) {
    switch (kind) {
      case 'ton':
        return this.adapters.ton;
      default:
        return undefined;
    }
  }
}

// ————————————————————————————————————————————————————————————————
// helpers
// ————————————————————————————————————————————————————————————————

function isOutboundBlocked(status: ProtoChainStatus | number): boolean {
  return status === ProtoChainStatus.CHAIN_STATUS_BLOCKED;
}

function isInboundBlocked(status: ProtoChainStatus | number): boolean {
  return status === ProtoChainStatus.CHAIN_STATUS_BLOCKED;
}

function chainTypeToKind(t: number): 'cosmos' | 'utxo' | 'payment' | 'ton' | 'solana' | 'evm' {
  const map = ['cosmos', 'utxo', 'payment', 'ton', 'solana', 'evm'] as const;
  return map[t] ?? 'cosmos';
}

function parseAssetId(id: string) {
  const i = id.indexOf('-');
  if (i < 0) throw new ProviderError(`invalid assetId: ${id}`);
  return { sourceChain: id.slice(0, i), denom: id.slice(i + 1) };
}

function cryptoRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number, msg = 'timeout'): Promise<T> {
  let to;
  const t = new Promise<never>((_, rej) => {
    to = setTimeout(() => rej(new ProviderError(msg)), ms);
  });
  try {
    const r = await Promise.race([p, t]);
    return r as T;
  } finally {
    clearTimeout(to);
  }
}
