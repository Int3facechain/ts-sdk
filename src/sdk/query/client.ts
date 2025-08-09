import { QueryClient, StargateClient, StargateClientOptions } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import {
  BridgeExtension,
  EpochsExtension,
  FeesExtension,
  IncentivesExtension,
  QuarantineExtension,
  RateLimitExtension,
  setupBridgeExtension,
  setupEpochsExtension,
  setupFeesExtension,
  setupIncentivesExtension,
  setupQuarantineExtension,
  setupRateLimitExtension,
  setupTokenFactoryExtension,
  TokenFactoryExtension,
} from './extensions';

export type BitfrostQueryExtensions = QueryClient &
  BridgeExtension &
  EpochsExtension &
  FeesExtension &
  IncentivesExtension &
  QuarantineExtension &
  RateLimitExtension &
  TokenFactoryExtension;

export function setupBitfrostQueryExtensions(
  base: QueryClient,
): Omit<BitfrostQueryExtensions, keyof QueryClient> {
  return {
    ...setupBridgeExtension(base),
    ...setupEpochsExtension(base),
    ...setupFeesExtension(base),
    ...setupIncentivesExtension(base),
    ...setupQuarantineExtension(base),
    ...setupRateLimitExtension(base),
    ...setupTokenFactoryExtension(base),
  } as const;
}

export class BitfrostQueryClient extends StargateClient {
  public readonly tmClient: Tendermint37Client;
  public readonly extensions: BitfrostQueryExtensions;

  protected constructor(
    tmClient: Tendermint37Client,
    options: StargateClientOptions,
    extensions: BitfrostQueryExtensions,
  ) {
    super(tmClient, options);
    this.tmClient = tmClient;
    this.extensions = extensions;
  }

  static async connect(
    endpoint: string,
    options: StargateClientOptions = {},
  ): Promise<BitfrostQueryClient> {
    const tmClient = await Tendermint37Client.connect(endpoint);
    const extensions = QueryClient.withExtensions(tmClient, setupBitfrostQueryExtensions);
    return new BitfrostQueryClient(tmClient, options, extensions);
  }
}
