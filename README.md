# BitFrost TypeScript SDK


The `@bitfrost/bitfrostjs` package provides simple abstractions for interacting with the BitFrost blockchain. It supports full query capabilities, transaction building, and sending transfers — both within the chain and cross‑chain.

The source code is located in the `src` directory.

---

## Table of Contents

* [Installation](#installation)
* [Usage](#usage)

    * [Creating a wallet](#creating-a-wallet)
    * [Querying data](#querying-data)
    * [Sending tokens in‑chain](#sending-tokens-in-chain)
    * [IBC transfer](#ibc-transfer)
    * [Outbound cross‑chain transfer](#outbound-cross-chain-transfer)

---

## Installation

Currently, installation is local only.

```bash
# Clone repository
git clone https://github.com/Int3facechain/ts-sdk
cd ts-sdk

# Build and link globally
pnpm build
pnpm link --global

# Link in your project
pnpm link @bitfrost/bitfrostjs
```

---

## Usage

The SDK provides two main clients:

* **`BitfrostQueryClient`** — for querying blockchain state.
* **`BitfrostTxClient`** — for building and broadcasting transactions.

### Creating a wallet

```ts
import * as bf from "@bitfrost/bitfrostjs";
import dotenv from "dotenv";

dotenv.config();

const wallet = await bf.Wallet.fromMnemonic(process.env.MNEMONIC!);
console.log("Address:", wallet.getAddress());
```

### Querying data

```ts
const query = await bf.BitfrostQueryClient.connect(RPC_ENDPOINT);
console.log("Current height:", await query.getHeight());
console.log("Balances:", await query.getAllBalances(wallet.getAddress()));
console.dir("Assets:", await query.extensions.bridge.getAssets(), {depth: null});
```

### Sending tokens in‑chain

```ts
const tx = await bf.BitfrostTxClient.connectWithSigner(RPC_ENDPOINT, wallet.getSigner());
const amount = coins(50000, 'uint3');
const res = await tx.sendTokens(wallet.getAddress(), "recipient-address", amount, "auto");
console.log(res.transactionHash);
```

### IBC transfer

```ts
const msg = {
  sourcePort: "transfer",
  sourceChannel: "channel-1",
  token: { denom: "uint3", amount: "25000" },
  sender: wallet.getAddress(),
  receiver: "destination-address",
  timeoutHeight: { revisionNumber: 0n, revisionHeight: 0n },
  timeoutTimestamp: BigInt(Date.now()) * 1_000_000n + 2n * 60n * 1_000_000_000n, // +2m
  memo: "",
};

const fee = { amount: [{ denom: "uint3", amount: "2000" }], gas: "200000" };
await tx.signAndBroadcast(wallet.getAddress(), [{
  typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
  value: msg,
}], fee, "IBC transfer");
```

### Outbound cross‑chain transfer

```ts
const eo = tx.extensions.bridge.makeOutboundTransfer({
  sender: wallet.getAddress(),
  destAddr: "external-chain-address",
  assetId: { sourceChain: "dogecoin", denom: "doge" },
  amount: "1000",
  destChainId: "dogecoin",
});

const fee = { amount: [{ denom: "uint3", amount: "2000" }], gas: "200000" };
const res = await tx.signAndBroadcast(wallet.getAddress(), [eo], fee, "Outbound transfer");
console.log(res.transactionHash);
```

---
