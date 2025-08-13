import {
  defaultRegistryTypes,
  GasPrice,
  QueryClient,
  SigningStargateClient,
  SigningStargateClientOptions,
} from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import { OfflineSigner, Registry } from '@cosmjs/proto-signing';

import { BitfrostQueryExtensions, setupBitfrostQueryExtensions } from '../query';

import { bridgeRegistryTypes, BridgeTxExtension, setupBridgeTxExtension } from './extensions';

export type BitfrostExtensions = BitfrostQueryExtensions & BridgeTxExtension;

export class BitfrostTxClient extends SigningStargateClient {
  public readonly tmClient: Tendermint37Client;
  public readonly extensions: BitfrostExtensions;

  protected constructor(
    tmClient: Tendermint37Client,
    signer: OfflineSigner,
    options: SigningStargateClientOptions,
  ) {
    super(tmClient, signer, options);
    this.tmClient = tmClient;
    this.extensions = QueryClient.withExtensions(
      tmClient,
      setupBitfrostQueryExtensions,
      setupBridgeTxExtension,
    );
  }

  static async connectWithSigner(
    endpoint: string,
    signer: OfflineSigner,
    options: SigningStargateClientOptions = {},
  ): Promise<BitfrostTxClient> {
    const tmClient = await Tendermint37Client.connect(endpoint);

    const registry =
      options.registry ?? new Registry([...defaultRegistryTypes, ...bridgeRegistryTypes]);

    return new BitfrostTxClient(tmClient, signer, {
      registry,
      gasPrice: GasPrice.fromString('0.025uint3'),
      broadcastPollIntervalMs: 1000,
      ...options,
    });
  }
}
