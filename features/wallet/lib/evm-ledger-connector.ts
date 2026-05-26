import {
  type Address,
  type EIP1193RequestFn,
  type Hex,
  RpcRequestError,
  SwitchChainError,
  type Transport,
  type WalletRpcSchema,
  custom,
  fromHex,
  getAddress,
  hexToBytes,
  isHex,
  numberToHex,
} from "viem";
import { rpc } from "viem/utils";
import { ChainNotConfiguredError, createConnector } from "wagmi";

import {
  type EthereumLedgerAccount,
  type EthereumLedgerSignerService,
  ethereumLedgerService,
  getEvmLedgerDerivationPath,
} from "@/lib/ledger/ethereum";

type EvmLedgerProvider = ReturnType<
  Transport<"custom", unknown, EIP1193RequestFn<WalletRpcSchema>>
>;

type EvmLedgerConnectorProperties = {
  connect<withCapabilities extends boolean = false>(parameters?: {
    chainId?: number | undefined;
    isReconnecting?: boolean | undefined;
    withCapabilities?: withCapabilities | boolean | undefined;
  }): Promise<{
    accounts: withCapabilities extends true
      ? readonly { address: Address; capabilities: Record<string, unknown> }[]
      : readonly Address[];
    chainId: number;
  }>;
  path: string;
};

interface CreateEvmLedgerConnectorOptions {
  account?: EthereumLedgerAccount;
  accountIndex?: number;
  service?: EthereumLedgerSignerService;
}

function normalizeTypedData(value: unknown) {
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}

function isSameAddress(a: Address, b: string) {
  return getAddress(a) === getAddress(b as Address);
}

function parsePersonalSignParams(params: unknown[] | undefined) {
  const [first, second] = params ?? [];
  if (typeof first !== "string" || typeof second !== "string") {
    throw new Error("Invalid personal_sign parameters.");
  }

  if (first.startsWith("0x") && second.startsWith("0x")) {
    return { address: second, message: first };
  }
  return { address: first, message: second };
}

function toLedgerMessage(message: string) {
  if (isHex(message)) {
    return hexToBytes(message);
  }
  return message;
}

export function createEvmLedgerConnector({
  account,
  accountIndex = 0,
  service = ethereumLedgerService,
}: CreateEvmLedgerConnectorOptions = {}) {
  let connected = false;
  let connectedAccount: EthereumLedgerAccount | undefined = account;

  return createConnector<EvmLedgerProvider, EvmLedgerConnectorProperties>(
    (config) => {
      let connectedChainId = config.chains[0].id;

      async function ensureAccount() {
        if (!connectedAccount) {
          connectedAccount = await service.getAccount(accountIndex);
        }
        return connectedAccount;
      }

      return {
        id: "ledgerUsb",
        name: "Ledger USB",
        type: "ledgerUsb",

        async connect<withCapabilities extends boolean = false>({
          chainId,
          withCapabilities,
        }: {
          chainId?: number | undefined;
          isReconnecting?: boolean | undefined;
          withCapabilities?: withCapabilities | boolean | undefined;
        } = {}) {
          const selectedAccount = await ensureAccount();
          if (chainId && connectedChainId !== chainId) {
            await this.switchChain?.({ chainId });
          }
          connected = true;

          const accounts = withCapabilities
            ? [{ address: selectedAccount.address, capabilities: {} }]
            : [selectedAccount.address];

          return {
            accounts: accounts as never,
            chainId: connectedChainId,
          };
        },

        async disconnect() {
          connected = false;
        },

        async getAccounts() {
          if (!connected || !connectedAccount) {
            throw new Error("Ledger USB is not connected.");
          }
          return [connectedAccount.address];
        },

        async getChainId() {
          return connectedChainId;
        },

        async getProvider({ chainId } = {}) {
          const selectedChainId = chainId ?? connectedChainId;
          const chain =
            config.chains.find(
              (candidate) => candidate.id === selectedChainId
            ) ?? config.chains[0];
          const url = chain.rpcUrls.default.http[0];

          const request: EIP1193RequestFn = async ({ method, params }) => {
            if (method === "eth_chainId") return numberToHex(connectedChainId);

            if (method === "eth_accounts") {
              return connected && connectedAccount
                ? [connectedAccount.address]
                : [];
            }

            if (method === "eth_requestAccounts") {
              const selectedAccount = await ensureAccount();
              connected = true;
              return [selectedAccount.address];
            }

            if (method === "net_version") {
              return String(connectedChainId);
            }

            if (method === "wallet_switchEthereumChain") {
              type Params = [{ chainId: Hex }];
              connectedChainId = fromHex(
                (params as Params)[0].chainId,
                "number"
              );
              this.onChainChanged(String(connectedChainId));
              return;
            }

            if (
              method === "eth_signTypedData" ||
              method === "eth_signTypedData_v3" ||
              method === "eth_signTypedData_v4"
            ) {
              const selectedAccount = await ensureAccount();
              const [address, typedData] = params as [string, unknown];
              if (!isSameAddress(selectedAccount.address, address)) {
                throw new Error(
                  "Ledger account does not match signing request."
                );
              }
              return service.signTypedData(
                selectedAccount.derivationPath,
                normalizeTypedData(typedData) as never
              );
            }

            if (method === "personal_sign") {
              const selectedAccount = await ensureAccount();
              const { address, message } = parsePersonalSignParams(
                params as unknown[] | undefined
              );
              if (!isSameAddress(selectedAccount.address, address)) {
                throw new Error(
                  "Ledger account does not match signing request."
                );
              }
              return service.signMessage(
                selectedAccount.derivationPath,
                toLedgerMessage(message)
              );
            }

            if (method === "eth_sign") {
              const selectedAccount = await ensureAccount();
              const [address, message] = params as [string, string];
              if (!isSameAddress(selectedAccount.address, address)) {
                throw new Error(
                  "Ledger account does not match signing request."
                );
              }
              return service.signMessage(
                selectedAccount.derivationPath,
                toLedgerMessage(message)
              );
            }

            if (method === "eth_sendTransaction") {
              throw new Error(
                "Ledger USB does not support direct transaction execution yet. Use a browser wallet for Safe execution."
              );
            }

            const body = { method, params };
            const { error, result } = await rpc.http(url, { body });
            if (error) {
              throw new RpcRequestError({ body, error, url });
            }
            return result;
          };

          return custom({ request })({ retryCount: 0 });
        },

        async isAuthorized() {
          return false;
        },

        async switchChain({ chainId }) {
          const chain = config.chains.find(
            (candidate) => candidate.id === chainId
          );
          if (!chain) {
            throw new SwitchChainError(new ChainNotConfiguredError());
          }
          connectedChainId = chain.id;
          config.emitter.emit("change", { chainId: chain.id });
          return chain;
        },

        onAccountsChanged(accounts) {
          if (accounts.length === 0) this.onDisconnect();
          else {
            config.emitter.emit("change", {
              accounts: accounts.map((value) => getAddress(value as Address)),
            });
          }
        },

        onChainChanged(chainId) {
          const numericChainId = Number(chainId);
          config.emitter.emit("change", { chainId: numericChainId });
        },

        async onDisconnect() {
          connected = false;
          config.emitter.emit("disconnect");
        },

        path: getEvmLedgerDerivationPath(accountIndex),
      };
    }
  );
}
