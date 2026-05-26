import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type SerializedWalletState,
  deserializeWalletState,
  serializeWalletState,
} from "@/lib/wallet-serialization";
import type { WalletState } from "@/types/wallet";
import { WalletType } from "@/types/wallet";

interface WalletStore extends WalletState {
  connectLedger: (
    publicKey: WalletState["publicKey"],
    derivationPath: string,
    deviceModel?: string
  ) => void;
  connectBrowser: (
    publicKey: WalletState["publicKey"],
    walletName: string
  ) => void;
  connectOkx: (publicKey: WalletState["publicKey"]) => void;
  disconnect: () => void;
}

const initialState: WalletState = {
  connected: false,
  publicKey: null,
  walletType: null,
  walletName: undefined,
  derivationPath: undefined,
  deviceModel: undefined,
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      ...initialState,

      connectLedger: (publicKey, derivationPath, deviceModel) => {
        set({
          connected: true,
          publicKey,
          walletType: WalletType.LEDGER,
          walletName: "Ledger",
          derivationPath,
          deviceModel,
        });
      },

      connectBrowser: (publicKey, walletName) => {
        set({
          connected: true,
          publicKey,
          walletType: WalletType.BROWSER,
          walletName,
          derivationPath: undefined,
          deviceModel: undefined,
        });
      },

      connectOkx: (publicKey) => {
        set({
          connected: true,
          publicKey,
          walletType: WalletType.OKX,
          walletName: "OKX Wallet",
          derivationPath: undefined,
          deviceModel: undefined,
        });
      },

      disconnect: () => {
        set(initialState);
      },
    }),
    {
      name: "squad-wallet",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          try {
            const { state, version } = JSON.parse(str);
            const deserialized = deserializeWalletState(
              state as SerializedWalletState
            );
            return { state: deserialized, version };
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          const serialized = serializeWalletState(value.state);
          localStorage.setItem(
            name,
            JSON.stringify({
              state: serialized,
              version: value.version,
            })
          );
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
