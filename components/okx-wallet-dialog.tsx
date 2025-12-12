"use client";

import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
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
import { okxWalletService } from "@/lib/okx-wallet";
import { useWalletStore } from "@/stores/wallet-store";

interface OkxWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OKX_WALLET_ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iYmxhY2siLz4KPHBhdGggZD0iTTEyLjUgOC41SDguNVYxMi41SDEyLjVWOC41WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE5LjUgOC41SDE1LjVWMTIuNUgxOS41VjguNVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMi41IDE1LjVIOC41VjE5LjVIMTIuNVYxNS41WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE5LjUgMTUuNUgxNS41VjE5LjVIMTkuNVYxNS41WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI2LjUgOC41SDIyLjVWMTIuNUgyNi41VjguNVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNi41IDE1LjVIMjIuNVYxOS41SDI2LjVWMTUuNVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMi41IDIyLjVIOC41VjI2LjVIMTIuNVYyMi41WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE5LjUgMjIuNUgxNS41VjI2LjVIMTkuNVYyMi41WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI2LjUgMjIuNUgyMi41VjI2LjVIMjYuNVYyMi41WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+";

const OKX_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge";

export function OkxWalletDialog({ open, onOpenChange }: OkxWalletDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connectOkx } = useWalletStore();

  const isInstalled = okxWalletService.isInstalled();

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await okxWalletService.connect();
      connectOkx(result.publicKey);
      onOpenChange(false);
      toast.success("Connected to OKX Wallet");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect to OKX Wallet";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = () => {
    window.open(OKX_EXTENSION_URL, "_blank");
  };

  const handleClose = () => {
    onOpenChange(false);
    setError(null);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect OKX Wallet</DialogTitle>
          <DialogDescription>
            Connect to OKX Wallet for universal SVM chain support
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

          {isInstalled ? (
            <div className="space-y-3">
              <button
                onClick={handleConnect}
                disabled={loading}
                className="hover:bg-accent flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Image
                  src={OKX_WALLET_ICON}
                  alt="OKX Wallet"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg"
                  unoptimized
                />
                <div className="flex-1">
                  <p className="font-medium">OKX Wallet</p>
                  <p className="text-muted-foreground text-xs">
                    Supports Ledger &amp; custom SVM chains
                  </p>
                </div>
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              </button>

              <p className="text-muted-foreground text-center text-xs">
                OKX Wallet supports hardware wallets (Ledger) and works with any
                SVM-compatible chain including Solaxy, Soon, and more.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <Image
                src={OKX_WALLET_ICON}
                alt="OKX Wallet"
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl opacity-50"
                unoptimized
              />
              <div className="text-center">
                <h3 className="font-semibold">OKX Wallet Not Detected</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Install the OKX Wallet browser extension to continue
                </p>
              </div>
              <button
                onClick={handleInstall}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Install OKX Wallet
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
