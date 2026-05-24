"use client";

import { AlertCircle, CheckCircle2, QrCode, Wallet, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect } from "wagmi";
import type { Connector } from "wagmi";

import { formatAddress } from "@/lib/utils/format-address";

import { useWcUri } from "../hooks/use-wc-uri";
import { DetectedBadge, SectionLabel, WalletIcon, WalletRow } from "./wallet-row";
import { WcQrModal } from "./wc-qr-modal";

interface EvmConnectPanelProps {
  onClose: () => void;
}

function isWalletConnect(connector: Connector) {
  return (
    connector.id === "walletConnect" ||
    connector.type === "walletConnect" ||
    connector.name.toLowerCase().includes("walletconnect")
  );
}

export function EvmConnectPanel({ onClose }: EvmConnectPanelProps) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors, variables } = useConnect();
  const { uri, clearUri } = useWcUri();
  const [error, setError] = useState<string | null>(null);

  const connectingConnector = variables?.connector;
  const connectingId =
    connectingConnector && "id" in connectingConnector
      ? connectingConnector.id
      : undefined;
  const isAnyConnecting = connectingId != null;

  const inlineConnectors = connectors.filter((c) => !isWalletConnect(c));
  const wcConnector = connectors.find((c) => isWalletConnect(c));

  const handleConnect = (connector: Connector) => {
    setError(null);
    connect(
      { connector },
      {
        onSuccess: () => {
          clearUri();
          toast.success(`Connected to ${connector.name}`);
          onClose();
        },
        onError: (err) => {
          clearUri();
          const isRejection =
            err.name === "UserRejectedRequestError" ||
            err.message?.toLowerCase().includes("rejected") ||
            err.message?.toLowerCase().includes("cancelled");
          if (isRejection) return;
          const message = err.message ?? "Failed to connect";
          setError(message);
          toast.error(message);
        },
      }
    );
  };

  if (isConnected && address) {
    return (
      <div className="border-border bg-card rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {activeConnector?.name ?? "EVM Wallet"}
            </p>
            <p className="text-muted-foreground font-mono text-xs">
              {formatAddress(address, 6, 4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (connectors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40">
          <Wallet className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">No Wallets Found</p>
          <p className="text-muted-foreground max-w-[240px] text-xs">
            Install an Ethereum wallet extension to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <WcQrModal uri={uri} onClose={clearUri} />

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

        {inlineConnectors.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Wallets</SectionLabel>
            {inlineConnectors.map((connector) => (
              <WalletRow
                key={connector.id}
                icon={<WalletIcon icon={connector.icon} name={connector.name} />}
                name={connector.name}
                subtitle={<DetectedBadge />}
                isLoading={connectingId === connector.id}
                disabled={isAnyConnecting}
                onClick={() => handleConnect(connector)}
              />
            ))}
          </div>
        )}

        {wcConnector && (
          <div className="flex flex-col gap-2">
            {inlineConnectors.length > 0 && (
              <div className="bg-border h-px w-full" />
            )}
            <SectionLabel>More options</SectionLabel>
            <WalletRow
              icon={<QrCode className="text-muted-foreground h-6 w-6" />}
              name="WalletConnect"
              subtitle="Scan QR with any mobile wallet"
              isLoading={connectingId === wcConnector.id}
              disabled={isAnyConnecting}
              onClick={() => handleConnect(wcConnector)}
            />
          </div>
        )}
      </div>
    </>
  );
}
