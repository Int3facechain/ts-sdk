import { Asset, BridgeStatus, Chain } from '../../generated/int3face/bridge/v1beta1/bridge';

export type Network = 'mainnet' | 'testnet';

export type ChainKind = 'cosmos' | 'utxo' | 'payment' | 'ton' | 'solana' | 'evm';

export type TransferKind = 'cosmos-tx' | 'bridge-outbound' | 'bridge-inbound' | 'external';

export type Timeouts = { canTransferMs?: number; executeMs?: number };

export interface RegistrySnapshot {
  chains: Record<string, Chain>;
  assets: Record<string, Asset>;
  bridgeStatus: BridgeStatus;
}

export interface TransferRequest {
  fromChainId: string;
  toChainId: string;
  assetId: string;
  amount: string;
  toAddress: string;
}

export interface TransferOptions {
  memoOverride?: string;
  fee?: unknown;
  dryRun?: boolean;
}

export type TransferRef =
  | { kind: 'cosmos-tx'; txHash: string }
  | { kind: 'bridge-outbound'; outboundId: string }
  | { kind: 'bridge-inbound'; inboundId: string }
  | { kind: 'external'; externalChainId: string; externalTxId: string };

export interface TransferHandle {
  txId: string;
  submitTxHash?: string;
  fromChainId: string;
  toChainId: string;
  assetId: string;
}

export interface CanTransferDecision {
  allowed: boolean;
  reason?: string;
}

export interface Estimate {
  bridgeFeeRate?: string;
}

export interface Logger {
  debug(...a: unknown[]): void;
  info(...a: unknown[]): void;
  warn(...a: unknown[]): void;
  error(...a: unknown[]): void;
}
