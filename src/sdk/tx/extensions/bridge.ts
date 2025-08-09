import type { EncodeObject, GeneratedType } from '@cosmjs/proto-signing';
import {
  MsgOutboundTransfer,
  protobufPackage,
} from '../../../generated/int3face/bridge/v1beta1/tx';

export const MSG_OUTBOUND_TYPE_URL = `/${protobufPackage}.MsgOutboundTransfer`; // => "/int3face.bridge.v1beta1.MsgOutboundTransfer"

export interface BridgeTxExtension {
  readonly bridge: {
    typeUrls: {
      outbound: string;
    };
    makeOutboundTransfer: (msg: MsgOutboundTransfer) => EncodeObject;
  };
}

export function setupBridgeTxExtension(): BridgeTxExtension {
  return {
    bridge: {
      typeUrls: { outbound: MSG_OUTBOUND_TYPE_URL },
      makeOutboundTransfer: (msg) => ({
        typeUrl: MSG_OUTBOUND_TYPE_URL,
        value: MsgOutboundTransfer.fromPartial(msg),
      }),
    },
  };
}

export const bridgeRegistryTypes: ReadonlyArray<[string, GeneratedType]> = [
  [MSG_OUTBOUND_TYPE_URL, MsgOutboundTransfer],
];
