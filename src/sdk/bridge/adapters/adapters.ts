import { ChainKind, TransferHandle, TransferRequest, RegistrySnapshot, Network } from '../types';

export interface AdapterContext {
  readonly registry: RegistrySnapshot;
  readonly network: Network;
  readonly logger?: {
    debug(...a: unknown[]): void;
    info(...a: unknown[]): void;
    warn(...a: unknown[]): void;
    error(...a: unknown[]): void;
  };
  readonly timeouts?: { canTransferMs?: number; executeMs?: number };
}

export interface BuiltTx {
  kind: ChainKind;
  raw?: unknown;
  meta?: Record<string, unknown>;
}

export interface ChainAdapter<TBuilt = BuiltTx, TProvider = unknown, THandle = TransferHandle> {
  readonly kind: ChainKind;
  canHandle(fromChainId: string, ctx: AdapterContext): boolean;
  build(req: TransferRequest, ctx: AdapterContext): Promise<TBuilt>;
  send?(built: TBuilt, provider: TProvider): Promise<THandle>;
}

export type AdaptersMap = Partial<Record<ChainKind, ChainAdapter>>;
