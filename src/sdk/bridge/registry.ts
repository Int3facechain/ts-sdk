import { RegistrySnapshot } from './types';
import { BitfrostQueryClient } from '../query';
import { Asset, Chain, BridgeStatus } from '../../generated/int3face/bridge/v1beta1/bridge';

export class Registry {
  private readonly query: BitfrostQueryClient;
  private cache!: RegistrySnapshot;
  private inflight?: Promise<void>;

  private constructor(query: BitfrostQueryClient) {
    this.query = query;
  }

  static async create(query: BitfrostQueryClient): Promise<Registry> {
    const registry = new Registry(query);
    await registry.refresh();
    return registry;
  }

  async refresh(): Promise<void> {
    if (this.inflight) return this.inflight;
    const job = this._refresh().finally(() => {
      if (this.inflight === job) this.inflight = undefined;
    });
    this.inflight = job;
    return job;
  }

  private async _refresh(): Promise<void> {
    const res = await this.query.extensions.bridge.getParams();
    const params = res?.params;

    const rawAssets = params?.assets ?? [];
    const rawChains = params?.chains ?? [];
    const bridgeStatus = params?.bridgeStatus ?? BridgeStatus.BRIDGE_STATUS_BLOCKED;

    const assets: Record<string, Asset> = {};
    for (const asset of rawAssets) {
      const sc = asset?.id?.sourceChain;
      const denom = asset?.id?.denom;
      if (!sc || !denom) continue;
      assets[`${sc}-${denom}`] = asset;
    }

    const chains: Record<string, Chain> = Object.fromEntries(
      rawChains.filter((c): c is Chain & { id: string } => !!c?.id).map((c) => [c.id, c]),
    );

    this.cache = Object.freeze({
      assets: Object.freeze(assets),
      chains: Object.freeze(chains),
      bridgeStatus,
    });
  }

  getSnapshot(): RegistrySnapshot {
    if (!this.cache) throw new Error('registry is not initialized yet');
    return this.cache;
  }

  getChain(id: string): Chain | undefined {
    return this.cache.chains[id];
  }
  getAsset(key: string): Asset | undefined {
    return this.cache.assets[key];
  }
}
