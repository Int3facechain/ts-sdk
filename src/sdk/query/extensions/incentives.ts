import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';

import {
  MsgQueryClaimableIncentivesRequest,
  MsgQueryParamsRequest,
  MsgQueryPendingIncentivesRequest,
  QueryClientImpl,
} from '../../../generated/int3face/incentives/query';

export interface IncentivesExtension {
  readonly incentives: {
    getParams(): ReturnType<QueryClientImpl['QueryParams']>;
    getPendingIncentives(): ReturnType<QueryClientImpl['QueryPendingIncentives']>;
    getClaimableIncentives(): ReturnType<QueryClientImpl['QueryClaimableIncentives']>;
  };
}

export function setupIncentivesExtension(base: QueryClient): IncentivesExtension {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return {
    incentives: {
      getParams: () => queryService.QueryParams({} as MsgQueryParamsRequest),
      getPendingIncentives: () =>
        queryService.QueryPendingIncentives({} as MsgQueryPendingIncentivesRequest),
      getClaimableIncentives: () =>
        queryService.QueryClaimableIncentives({} as MsgQueryClaimableIncentivesRequest),
    },
  };
}
