export type BridgeErrorCode =
  | 'BRIDGE_BLOCKED'
  | 'ASSET_BLOCKED'
  | 'UNSUPPORTED_ASSET'
  | 'AMOUNT_TOO_LOW'
  | 'CHAIN_UNAVAILABLE'
  | 'DIRECTION_BLOCKED'
  | 'CAN_TRANSFER_DECLINED'
  | 'PROVIDER_ERROR';

export abstract class BridgeError extends Error {
  abstract code: BridgeErrorCode;
  constructor(
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BridgeBlockedError extends BridgeError {
  code = 'BRIDGE_BLOCKED' as const;
}
export class AssetBlockedError extends BridgeError {
  code = 'ASSET_BLOCKED' as const;
}
export class UnsupportedAssetError extends BridgeError {
  code = 'UNSUPPORTED_ASSET' as const;
}
export class AmountTooLowError extends BridgeError {
  code = 'AMOUNT_TOO_LOW' as const;
}
export class ChainUnavailableError extends BridgeError {
  code = 'CHAIN_UNAVAILABLE' as const;
}
export class ChainAssetDirectionBlockedError extends BridgeError {
  code = 'DIRECTION_BLOCKED' as const;
}
export class CanTransferDeclinedError extends BridgeError {
  code = 'CAN_TRANSFER_DECLINED' as const;
}
export class ProviderError extends BridgeError {
  code = 'PROVIDER_ERROR' as const;
}
