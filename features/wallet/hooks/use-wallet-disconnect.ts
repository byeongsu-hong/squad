import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { useDisconnect } from "wagmi";

import { ledgerService } from "@/lib/ledger";
import { okxWalletService } from "@/lib/okx-wallet";
import { useWalletStore } from "@/stores/wallet-store";
import { WalletType } from "@/types/wallet";

export function useWalletDisconnect() {
  const { walletType, disconnect: disconnectStore } = useWalletStore();
  const { disconnect: disconnectAdapter } = useWallet();
  const { disconnect: disconnectEvm } = useDisconnect();

  const disconnect = useCallback(async () => {
    try {
      if (walletType === WalletType.LEDGER) {
        await ledgerService.disconnect();
      } else if (walletType === WalletType.BROWSER) {
        await disconnectAdapter();
      } else if (walletType === WalletType.OKX) {
        await okxWalletService.disconnect();
      }

      disconnectEvm();
      disconnectStore();
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast.error("Failed to disconnect wallet");
    }
  }, [walletType, disconnectStore, disconnectAdapter, disconnectEvm]);

  return { disconnect };
}
