import { DirectSecp256k1HdWallet, OfflineSigner } from '@cosmjs/proto-signing';
import * as bip39 from 'bip39';

export class Wallet {
  private readonly wallet: DirectSecp256k1HdWallet;
  private readonly address: string;
  private readonly prefix: string;

  private constructor(wallet: DirectSecp256k1HdWallet, address: string, prefix: string) {
    this.wallet = wallet;
    this.address = address;
    this.prefix = prefix;
  }

  public static async fromMnemonic(mnemonic: string, prefix = 'int3'): Promise<Wallet> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix });
    const [account] = await wallet.getAccounts();
    return new Wallet(wallet, account.address, prefix);
  }

  public static generateMnemonic(): string {
    return bip39.generateMnemonic(256);
  }

  public getAddress(): string {
    return this.address;
  }

  public getPrefix(): string {
    return this.prefix;
  }

  public getSigner(): OfflineSigner {
    return this.wallet;
  }
}
