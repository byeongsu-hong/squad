"use client";

import {
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Loader2,
  Usb,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBrowserWallet } from "@/lib/hooks/use-browser-wallet";
import { okxWalletService } from "@/lib/okx-wallet";
import { cn } from "@/lib/utils";
import { OKX_EXTENSION_URL, OKX_WALLET_ICON } from "@/lib/wallet/okx-icon";
import { useWalletStore } from "@/stores/wallet-store";

interface SolanaConnectPanelProps {
  onClose: () => void;
  onOpenLedger: () => void;
}

function WalletIcon({
  icon,
  name,
}: {
  icon: string | null | undefined;
  name: string;
}) {
  if (!icon) {
    return (
      <Wallet className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
    );
  }

  return (
    <Image
      src={icon}
      alt={`${name} icon`}
      width={24}
      height={24}
      className="h-6 w-6 rounded-md object-contain"
      unoptimized
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

interface WalletRowProps {
  icon: React.ReactNode;
  name: string;
  subtitle: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function WalletRow({
  icon,
  name,
  subtitle,
  isLoading = false,
  disabled = false,
  onClick,
}: WalletRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition-all hover:border-primary/30 hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="shrink-0">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </button>
  );
}

function DetectedBadge() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
      Detected
    </span>
  );
}

function InstallLink({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground/70">
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

  const handleBrowserWallet = async (wallet: (typeof installedWallets)[number]) => {
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
      {/* Inline error alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-destructive/60 hover:text-destructive transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Empty state */}
      {hasNoWallets && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
            <Wallet className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">No Wallets Found</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Install a Solana wallet extension to get started
            </p>
          </div>
        </div>
      )}

      {/* Installed wallets */}
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

      {/* OKX Wallet */}
      <div className={cn("flex flex-col gap-2", hasInstalled && "mt-0")}>
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
              <InstallLink url={OKX_EXTENSION_URL}>Click to install</InstallLink>
            )
          }
          isLoading={loadingWallet === "OKX Wallet"}
          disabled={isAnyLoading}
          onClick={
            isOkxInstalled
              ? handleOkx
              : () => handleInstallLink(OKX_EXTENSION_URL)
          }
        />

        {/* Ledger */}
        <WalletRow
          icon={<Usb className="h-6 w-6 text-muted-foreground" />}
          name="Ledger"
          subtitle="Hardware device"
          disabled={isAnyLoading}
          onClick={onOpenLedger}
        />
      </div>

      {/* Separator between installed and available */}
      {(hasInstalled || isOkxInstalled) && hasAvailable && (
        <div className="h-px w-full bg-border" />
      )}

      {/* Available (not installed) wallets */}
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
              subtitle={
                <InstallLink url={wallet.adapter.url}>
                  Click to install
                </InstallLink>
              }
              disabled={isAnyLoading}
              onClick={() => handleInstallLink(wallet.adapter.url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
