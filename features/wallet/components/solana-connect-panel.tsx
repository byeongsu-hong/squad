"use client";

import { AlertCircle, ExternalLink, QrCode, Usb, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { okxWalletService } from "@/lib/okx-wallet";
import { useWalletStore } from "@/stores/wallet-store";

import { OKX_EXTENSION_URL, OKX_WALLET_ICON } from "../assets/okx-icon";
import { useBrowserWallet } from "../hooks/use-browser-wallet";
import { WALLETCONNECT_UNCONFIGURED_MESSAGE } from "../lib/walletconnect";
import {
  prepareWalletConnectModalState,
  subscribeWalletConnectModalClose,
} from "../lib/walletconnect-appkit";
import {
  DetectedBadge,
  SectionLabel,
  WalletIcon,
  WalletRow,
} from "./wallet-row";

interface SolanaConnectPanelProps {
  onClose: () => void;
  onOpenLedger: () => void;
}

function InstallLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground/60 inline-flex items-center gap-1">
      {children}
      <ExternalLink className="h-3 w-3" />
    </span>
  );
}

export function SolanaConnectPanel({
  onClose,
  onOpenLedger,
}: SolanaConnectPanelProps) {
  const {
    installedWallets,
    availableWallets: allAvailable,
    connect,
  } = useBrowserWallet();
  const { connectOkx } = useWalletStore();
  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOkxInstalled = okxWalletService.isInstalled();
  const isAnyLoading = loadingWallet !== null;

  const wcWallet = [...installedWallets, ...allAvailable].find(
    (w) => w.adapter.name === "WalletConnect"
  );
  const installedWalletsWithoutWc = installedWallets.filter(
    (w) => w.adapter.name !== "WalletConnect"
  );
  const availableWallets = allAvailable.filter(
    (w) => w.adapter.name !== "WalletConnect"
  );

  useEffect(() => {
    if (loadingWallet !== "WalletConnect") return;

    let disposed = false;
    let unsubscribe: () => void = () => undefined;

    void subscribeWalletConnectModalClose(() => {
      setLoadingWallet((current) =>
        current === "WalletConnect" ? null : current
      );
    }).then((nextUnsubscribe) => {
      if (disposed) {
        nextUnsubscribe();
        return;
      }
      unsubscribe = nextUnsubscribe;
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [loadingWallet]);

  const handleBrowserWallet = async (
    wallet: (typeof installedWallets)[number]
  ) => {
    const name = wallet.adapter.name;
    setError(null);
    setLoadingWallet(name);
    try {
      if (name === "WalletConnect") {
        await prepareWalletConnectModalState("solana");
      }
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

  const handleWalletConnect = () => {
    if (!wcWallet) {
      setError(WALLETCONNECT_UNCONFIGURED_MESSAGE);
      toast.error(WALLETCONNECT_UNCONFIGURED_MESSAGE);
      return;
    }

    void handleBrowserWallet(wcWallet);
  };

  const hasInstalled = installedWalletsWithoutWc.length > 0;
  const hasAvailable = availableWallets.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-xl border px-4 py-3">
          <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-destructive flex-1 text-[12px]">{error}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setError(null)}
            className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0 rounded-md"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {hasInstalled && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Installed</SectionLabel>
          {installedWalletsWithoutWc.map((wallet) => (
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
        {hasInstalled && <SectionLabel>Other</SectionLabel>}
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
          onClick={
            isOkxInstalled
              ? handleOkx
              : () => handleInstallLink(OKX_EXTENSION_URL)
          }
        />

        <WalletRow
          icon={<QrCode className="text-muted-foreground h-6 w-6" />}
          name="WalletConnect"
          subtitle={
            wcWallet ? "Open WalletConnect modal" : "Project id required"
          }
          isLoading={loadingWallet === "WalletConnect"}
          disabled={isAnyLoading}
          onClick={handleWalletConnect}
        />

        <WalletRow
          icon={<Usb className="text-muted-foreground h-6 w-6" />}
          name="Ledger USB"
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
