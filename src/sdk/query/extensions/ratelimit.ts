import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';

import {
  AllRateLimitsRequest,
  QueryClientImpl,
  RateLimitRequest,
} from '../../../generated/int3face/ratelimit/query';

export interface RateLimitExtension {
  readonly ratelimit: {
    getAll(): ReturnType<QueryClientImpl['AllRateLimits']>;
    get(chain: string, assetId: string): ReturnType<QueryClientImpl['RateLimit']>;
  };
}

export function setupRateLimitExtension(base: QueryClient): RateLimitExtension {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return {
    ratelimit: {
      getAll: () => queryService.AllRateLimits({} as AllRateLimitsRequest),
      get: (chain, assetId) => queryService.RateLimit({ chain, assetId } as RateLimitRequest),
    },
  };
}
