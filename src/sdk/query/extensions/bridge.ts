import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';
import Long from 'long';

import {
  CanTransferRequest,
  ChainBalancesRequest,
  QueryAssetRequest,
  QueryAssetsRequest,
  QueryChainRequest,
  QueryChainsRequest,
  QueryClientImpl,
  QueryInboundTransferRequest,
  QueryParamsRequest,
  QueryProposalRequest,
  QueryProposalsRequest,
  QueryTssKeyGenRequest,
  QueryTssKeyGensRequest,
} from '../../../generated/int3face/bridge/v1beta1/query';

export interface BridgeExtension {
  readonly bridge: {
    getChains(): ReturnType<QueryClientImpl['GetChains']>;
    getChain(chainId: string): ReturnType<QueryClientImpl['GetChain']>;
    getAssets(): ReturnType<QueryClientImpl['GetAssets']>;
    getAsset(assetId: string): ReturnType<QueryClientImpl['GetAsset']>;
    getProposal(id: string): ReturnType<QueryClientImpl['Proposal']>;
    getProposals(): ReturnType<QueryClientImpl['Proposals']>;
    getParams(): ReturnType<QueryClientImpl['Params']>;
    getLastTransferHeight(
      sourceChain: string,
      denom: string,
    ): ReturnType<QueryClientImpl['LastTransferHeight']>;
    getChainBalances(chainId: string): ReturnType<QueryClientImpl['ChainBalances']>;
    canTransfer(request: CanTransferRequest): ReturnType<QueryClientImpl['CanTransfer']>;
    getInboundTransfer(id: string): ReturnType<QueryClientImpl['InboundTransfer']>;
    getOutboundTransfer(txHash: string): ReturnType<QueryClientImpl['OutboundTransfer']>;
    getTssKeyGen(id: string): ReturnType<QueryClientImpl['TssKeyGen']>;
    getTssKeyGens(finalizedOnly?: boolean): ReturnType<QueryClientImpl['TssKeyGens']>;
    getLastTssKeyGen(): ReturnType<QueryClientImpl['LastTssKeyGen']>;
  };
}

export function setupBridgeExtension(base: QueryClient): BridgeExtension {
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return {
    bridge: {
      getChains: () => queryService.GetChains({} as QueryChainsRequest),
      getChain: (chainId) => queryService.GetChain({ chainId } as QueryChainRequest),
      getAssets: () => queryService.GetAssets({} as QueryAssetsRequest),
      getAsset: (assetId) => queryService.GetAsset({ assetId } as QueryAssetRequest),
      getProposal: (id) =>
        queryService.Proposal({ proposalId: Long.fromString(id) } as QueryProposalRequest),
      getProposals: () =>
        queryService.Proposals({ pagination: undefined } as QueryProposalsRequest),
      getParams: () => queryService.Params({} as QueryParamsRequest),
      getLastTransferHeight: (sourceChain, denom) =>
        queryService.LastTransferHeight({ assetId: { sourceChain, denom } }),
      getChainBalances: (chainId) =>
        queryService.ChainBalances({ chainId } as ChainBalancesRequest),
      canTransfer: (request) => queryService.CanTransfer(request),
      getInboundTransfer: (transferId) =>
        queryService.InboundTransfer({ transferId } as QueryInboundTransferRequest),
      getOutboundTransfer: (txHash) => queryService.OutboundTransfer({ txHash }),
      getTssKeyGen: (keygenId) => queryService.TssKeyGen({ keygenId } as QueryTssKeyGenRequest),
      getTssKeyGens: (finalizedOnly = false) =>
        queryService.TssKeyGens({
          finalizedOnly,
          pagination: undefined,
        } as QueryTssKeyGensRequest),
      getLastTssKeyGen: () => queryService.LastTssKeyGen({}),
    },
  };
}
