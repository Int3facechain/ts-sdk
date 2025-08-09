import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';
import {
  MsgQueryBridgeFeesRequest,
  MsgQueryFeeEstimationRequest,
  MsgQueryParamsRequest,
  QueryClientImpl,
} from '../../../generated/int3face/fees/query';
import { AssetID } from '../../../generated/int3face/bridge/v1beta1/bridge';

export interface FeesExtension {
  readonly fees: {
    getParams(): ReturnType<QueryClientImpl['QueryParams']>;
    getBridgeFees(): ReturnType<QueryClientImpl['QueryBridgeFees']>;
    estimateFee(
      srcChainId: string,
      dstChainId: string,
      assetId: AssetID,
    ): ReturnType<QueryClientImpl['QueryFeeEstimation']>;
  };
}

export function setupFeesExtension(base: QueryClient): FeesExtension {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return {
    fees: {
      getParams: () => queryService.QueryParams({} as MsgQueryParamsRequest),
      getBridgeFees: () => queryService.QueryBridgeFees({} as MsgQueryBridgeFeesRequest),
      estimateFee: (srcChainId, dstChainId, assetId) =>
        queryService.QueryFeeEstimation({
          srcChainId,
          dstChainId,
          assetId,
        } as MsgQueryFeeEstimationRequest),
    },
  };
}
