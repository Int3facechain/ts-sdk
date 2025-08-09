import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';

import {
  QueryAllBeforeSendHooksAddressesRequest,
  QueryBeforeSendHookAddressRequest,
  QueryClientImpl,
  QueryDenomAuthorityMetadataRequest,
  QueryDenomsFromCreatorRequest,
  QueryParamsRequest,
} from '../../../generated/int3face/tokenfactory/v1beta1/query';

export interface TokenFactoryExtension {
  readonly tokenfactory: {
    getParams(): ReturnType<QueryClientImpl['Params']>;
    getAuthorityMetadata(denom: string): ReturnType<QueryClientImpl['DenomAuthorityMetadata']>;
    getDenomsFromCreator(creator: string): ReturnType<QueryClientImpl['DenomsFromCreator']>;
    getBeforeSendHookAddress(denom: string): ReturnType<QueryClientImpl['BeforeSendHookAddress']>;
    getAllBeforeSendHookAddresses(): ReturnType<QueryClientImpl['AllBeforeSendHooksAddresses']>;
  };
}

export function setupTokenFactoryExtension(base: QueryClient): TokenFactoryExtension {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return {
    tokenfactory: {
      getParams: () => queryService.Params({} as QueryParamsRequest),
      getAuthorityMetadata: (denom: string) =>
        queryService.DenomAuthorityMetadata({ denom } as QueryDenomAuthorityMetadataRequest),
      getDenomsFromCreator: (creator: string) =>
        queryService.DenomsFromCreator({ creator } as QueryDenomsFromCreatorRequest),
      getBeforeSendHookAddress: (denom: string) =>
        queryService.BeforeSendHookAddress({ denom } as QueryBeforeSendHookAddressRequest),
      getAllBeforeSendHookAddresses: () =>
        queryService.AllBeforeSendHooksAddresses({} as QueryAllBeforeSendHooksAddressesRequest),
    },
  };
}
