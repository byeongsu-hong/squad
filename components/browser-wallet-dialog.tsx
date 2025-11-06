"use client";

import type { Wallet } from "@solana/wallet-adapter-react";
import { AlertCircle, Loader2, Wallet as WalletIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBrowserWallet } from "@/lib/hooks/use-browser-wallet";

interface BrowserWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrowserWalletDialog({
  open,
  onOpenChange,
}: BrowserWalletDialogProps) {
  const { installedWallets, availableWallets, connect } = useBrowserWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletSelect = async (wallet: Wallet) => {
    setLoading(true);
    setError(null);

    try {
      const result = await connect(wallet);
      onOpenChange(false);
      toast.success(`Connected to ${result.walletName}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setError(null);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Connect Browser Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to Solana Mainnet
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {error && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
                <AlertCircle className="text-destructive h-8 w-8" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold">Connection Failed</h3>
                <p className="text-muted-foreground mt-2 text-sm">{error}</p>
              </div>
            </div>
          )}

          {installedWallets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Installed Wallets</h3>
              <div className="space-y-2">
                {installedWallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletSelect(wallet)}
                    disabled={loading}
                    className="hover:bg-accent flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {wallet.adapter.icon && (
                      <Image
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        width={32}
                        height={32}
                        className="h-8 w-8"
                        unoptimized
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{wallet.adapter.name}</p>
                      <p className="text-muted-foreground text-xs">Detected</p>
                    </div>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableWallets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Available Wallets</h3>
              <div className="space-y-2">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => {
                      if (wallet.adapter.url) {
                        window.open(wallet.adapter.url, "_blank");
                      }
                    }}
                    className="hover:bg-accent flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors"
                  >
                    {wallet.adapter.icon && (
                      <Image
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 opacity-50"
                        unoptimized
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{wallet.adapter.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Click to install
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {installedWallets.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
                <WalletIcon className="text-primary h-10 w-10" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold">No Wallets Detected</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Please install a Solana wallet extension to continue
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
