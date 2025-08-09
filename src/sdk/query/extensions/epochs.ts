import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';

import {
  QueryClientImpl,
  QueryCurrentEpochRequest,
  QueryEpochsInfoRequest,
} from '../../../generated/int3face/epochs/query';

export interface EpochsExtension {
  readonly epochs: {
    epochInfos(): ReturnType<QueryClientImpl['EpochInfos']>;
    currentEpoch(identifier: string): ReturnType<QueryClientImpl['CurrentEpoch']>;
  };
}

export function setupEpochsExtension(base: QueryClient): EpochsExtension {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return {
    epochs: {
      epochInfos: () => queryService.EpochInfos({} as QueryEpochsInfoRequest),
      currentEpoch: (identifier: string) =>
        queryService.CurrentEpoch({ identifier } as QueryCurrentEpochRequest),
    },
  };
}
