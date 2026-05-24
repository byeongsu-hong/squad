"use client";

import { AlertCircle, ExternalLink, Usb, Wallet, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { okxWalletService } from "@/lib/okx-wallet";
import { useWalletStore } from "@/stores/wallet-store";

import { useBrowserWallet } from "../hooks/use-browser-wallet";
import { OKX_EXTENSION_URL, OKX_WALLET_ICON } from "../assets/okx-icon";
import { DetectedBadge, SectionLabel, WalletIcon, WalletRow } from "./wallet-row";

interface SolanaConnectPanelProps {
  onClose: () => void;
  onOpenLedger: () => void;
}

function InstallLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground/70 inline-flex items-center gap-1">
      {children}
      <ExternalLink className="h-3 w-3" />
    </span>
  );
}

export function SolanaConnectPanel({
  onClose,
  onOpenLedger,
}: SolanaConnectPanelProps) {
  const { installedWallets, availableWallets, connect } = useBrowserWallet();
  const { connectOkx } = useWalletStore();
  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOkxInstalled = okxWalletService.isInstalled();
  const isAnyLoading = loadingWallet !== null;

  const handleBrowserWallet = async (
    wallet: (typeof installedWallets)[number]
  ) => {
    const name = wallet.adapter.name;
    setError(null);
    setLoadingWallet(name);
    try {
      await connect(wallet);
      toast.success(`Connected to ${name}`);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingWallet(null);
    }
  };

  const handleOkx = async () => {
    setError(null);
    setLoadingWallet("OKX Wallet");
    try {
      const result = await okxWalletService.connect();
      connectOkx(result.publicKey);
      toast.success("Connected to OKX Wallet");
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect OKX Wallet";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingWallet(null);
    }
  };

  const handleInstallLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hasInstalled = installedWallets.length > 0;
  const hasAvailable = availableWallets.length > 0;
  const hasNoWallets = !hasInstalled && !hasAvailable && !isOkxInstalled;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-xl border px-4 py-3">
          <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-destructive flex-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-destructive/60 hover:text-destructive shrink-0 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {hasNoWallets && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <Wallet className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">No Wallets Found</p>
            <p className="text-muted-foreground max-w-[240px] text-xs">
              Install a Solana wallet extension to get started
            </p>
          </div>
        </div>
      )}

      {hasInstalled && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Installed</SectionLabel>
          {installedWallets.map((wallet) => (
            <WalletRow
              key={wallet.adapter.name}
              icon={
                <WalletIcon
                  icon={wallet.adapter.icon}
                  name={wallet.adapter.name}
                />
              }
              name={wallet.adapter.name}
              subtitle={<DetectedBadge />}
              isLoading={loadingWallet === wallet.adapter.name}
              disabled={isAnyLoading}
              onClick={() => handleBrowserWallet(wallet)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!hasInstalled && <SectionLabel>Wallets</SectionLabel>}
        <WalletRow
          icon={
            <Image
              src={OKX_WALLET_ICON}
              alt="OKX Wallet icon"
              width={24}
              height={24}
              className="h-6 w-6 rounded-md object-contain"
              unoptimized
            />
          }
          name="OKX Wallet"
          subtitle={
            isOkxInstalled ? (
              <DetectedBadge />
            ) : (
              <InstallLink>Click to install</InstallLink>
            )
          }
          isLoading={loadingWallet === "OKX Wallet"}
          disabled={isAnyLoading}
          onClick={isOkxInstalled ? handleOkx : () => handleInstallLink(OKX_EXTENSION_URL)}
        />

        <WalletRow
          icon={<Usb className="text-muted-foreground h-6 w-6" />}
          name="Ledger"
          subtitle="Hardware device"
          disabled={isAnyLoading}
          onClick={onOpenLedger}
        />
      </div>

      {(hasInstalled || isOkxInstalled) && hasAvailable && (
        <div className="bg-border h-px w-full" />
      )}

      {hasAvailable && (
        <div className="flex flex-col gap-2">
          <SectionLabel>More Wallets</SectionLabel>
          {availableWallets.map((wallet) => (
            <WalletRow
              key={wallet.adapter.name}
              icon={
                <WalletIcon
                  icon={wallet.adapter.icon}
                  name={wallet.adapter.name}
                />
              }
              name={wallet.adapter.name}
              subtitle={<InstallLink>Click to install</InstallLink>}
              disabled={isAnyLoading}
              onClick={() => handleInstallLink(wallet.adapter.url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
