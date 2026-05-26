import { describe, expect, it, vi } from "vitest";
import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";

import type {
  EthereumLedgerAccount,
  EthereumLedgerSignerService,
} from "@/lib/ledger/ethereum";

import { createEvmLedgerConnector } from "./evm-ledger-connector";

const account: EthereumLedgerAccount = {
  address: "0x1111111111111111111111111111111111111111",
  derivationPath: "44'/60'/0'/0/0",
  displayPath: "m/44'/60'/0'/0/0",
  index: 0,
};

function createProvider() {
  const signature = `0x${"aa".repeat(32)}${"bb".repeat(32)}1b` as const;
  const service: EthereumLedgerSignerService = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    getAccount: vi.fn(async () => account),
    getAccounts: vi.fn(async () => [account]),
    signMessage: vi.fn(async () => signature),
    signTypedData: vi.fn(async () => signature),
  };

  const config = createConfig({
    chains: [mainnet, base],
    connectors: [createEvmLedgerConnector({ account, service })],
    transports: {
      [mainnet.id]: http(),
      [base.id]: http(),
    },
  });
  const connector = config.connectors[0];

  return { connector, service, signature };
}

describe("createEvmLedgerConnector", () => {
  it("signs typed data with the selected Ethereum Ledger derivation path", async () => {
    const { connector, service, signature } = createProvider();
    const typedData = {
      domain: { chainId: 1, verifyingContract: account.address },
      message: { safeTxHash: "0x1234" },
      primaryType: "SafeTx",
      types: { SafeTx: [{ name: "safeTxHash", type: "bytes32" }] },
    };

    await connector.connect();
    const provider = (await connector.getProvider()) as {
      request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    };

    await expect(
      provider.request({
        method: "eth_signTypedData_v4",
        params: [account.address, JSON.stringify(typedData)],
      })
    ).resolves.toBe(signature);
    expect(service.signTypedData).toHaveBeenCalledWith(
      account.derivationPath,
      typedData
    );
  });

  it("switches chains without re-routing Ledger through WalletConnect", async () => {
    const { connector } = createProvider();

    await connector.connect();
    await expect(
      connector.switchChain?.({ chainId: base.id })
    ).resolves.toMatchObject({
      id: base.id,
    });
    await expect(connector.getChainId()).resolves.toBe(base.id);
  });
});
