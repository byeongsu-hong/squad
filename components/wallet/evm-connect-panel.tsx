"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  QrCode,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect } from "wagmi";
import type { Connector } from "wagmi";

import { formatAddress } from "@/lib/utils/format-address";

interface EvmConnectPanelProps {
  onClose: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  );
}

interface WalletRowProps {
  icon: React.ReactNode;
  name: string;
  subtitle?: React.ReactNode;
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
      className="group border-border bg-card hover:border-primary/30 hover:bg-accent/50 flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {subtitle && (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        )}
      </div>
      <div className="shrink-0">
        {isLoading ? (
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        ) : (
          <ChevronRight className="text-muted-foreground/50 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </button>
  );
}

function ConnectorIcon({ icon, name }: { icon?: string; name: string }) {
  const src = icon?.trimStart();
  if (!src) {
    return (
      <Wallet className="text-muted-foreground h-6 w-6" aria-hidden="true" />
    );
  }
  return (
    <Image
      src={src}
      alt={`${name} icon`}
      width={24}
      height={24}
      className="h-6 w-6 rounded-md object-contain"
      unoptimized
    />
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
          toast.success(`Connected to ${connector.name}`);
          onClose();
        },
        onError: (err) => {
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
          <SectionLabel>Installed</SectionLabel>
          {inlineConnectors.map((connector) => (
            <WalletRow
              key={connector.id}
              icon={
                <ConnectorIcon icon={connector.icon} name={connector.name} />
              }
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
  );
}
