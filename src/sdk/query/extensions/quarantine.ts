import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';

import {
  QueryClientImpl,
  QueryParamsRequest,
  QueueItemRequest,
  QueueItemsRequest,
} from '../../../generated/int3face/quarantine/query';

export interface QuarantineExtension {
  readonly quarantine: {
    getParams(): ReturnType<QueryClientImpl['Params']>;
    getQueueItem(id: string): ReturnType<QueryClientImpl['QueueItem']>;
    getQueueItems(): ReturnType<QueryClientImpl['QueueItems']>;
  };
}

export function setupQuarantineExtension(base: QueryClient): QuarantineExtension {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return {
    quarantine: {
      getParams: () => queryService.Params({} as QueryParamsRequest),
      getQueueItem: (id: string) => queryService.QueueItem({ id } as QueueItemRequest),
      getQueueItems: () => queryService.QueueItems({ pagination: undefined } as QueueItemsRequest),
    },
  };
}
