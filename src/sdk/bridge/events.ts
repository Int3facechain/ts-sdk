import { TransferRequest, CanTransferDecision, TransferHandle, TransferRef } from './types';
import { BridgeError } from './errors';
import { BuiltTx } from './adapters';

type Correlation = { correlationId: string };

export type TransferEvent =
  | ({ type: 'onPreflight'; req: TransferRequest; ts: number } & Correlation)
  | ({
      type: 'onCanTransfer';
      req: TransferRequest;
      decision: CanTransferDecision;
      ts: number;
    } & Correlation)
  | ({ type: 'onBuilt'; req: TransferRequest; built: BuiltTx; ts: number } & Correlation)
  | ({
      type: 'onSubmitted';
      req: TransferRequest;
      handle: TransferHandle;
      ts: number;
    } & Correlation)
  | ({ type: 'onConfirmed'; ref: TransferRef; ts: number } & Correlation)
  | ({ type: 'onFailed'; error: BridgeError; ref?: TransferRef; ts: number } & Correlation);

export type Listener = (e: TransferEvent) => void;
