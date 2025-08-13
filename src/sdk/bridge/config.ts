import { Network, Timeouts, Logger } from './types';
import { AdaptersMap } from './adapters';
import { BitfrostQueryClient } from '../query';

export interface BridgeConfig {
  query: BitfrostQueryClient;
  pollIntervalMs?: number;
  timeouts?: Timeouts;
  logger?: Logger;
  adapters?: AdaptersMap;
  network: Network;
}
