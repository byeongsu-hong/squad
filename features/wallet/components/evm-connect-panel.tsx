"use client";

import { AlertCircle, CheckCircle2, QrCode, Usb, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect } from "wagmi";
import type { Connector } from "wagmi";

import { Button } from "@/components/ui/button";
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
  const [wcIntent, setWcIntent] = useState<"ledger" | "walletconnect" | null>(null);

  const connectingConnector = variables?.connector;
  const connectingId =
    connectingConnector && "id" in connectingConnector
      ? connectingConnector.id
      : undefined;
  const isAnyConnecting = connectingId != null;

  const inlineConnectors = connectors.filter((c) => !isWalletConnect(c));
  const wcConnector = connectors.find((c) => isWalletConnect(c));

  const handleConnect = (connector: Connector, intent?: "ledger" | "walletconnect") => {
    setError(null);
    if (intent) setWcIntent(intent);
    connect(
      { connector },
      {
        onSuccess: () => {
          clearUri();
          setWcIntent(null);
          const label = intent === "ledger" ? "Ledger" : connector.name;
          toast.success(`Connected to ${label}`);
          onClose();
        },
        onError: (err) => {
          clearUri();
          setWcIntent(null);
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
      <div className="border-border bg-muted rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">
              {activeConnector?.name ?? "EVM Wallet"}
            </p>
            <p className="text-muted-foreground/60 font-mono text-xs">
              {formatAddress(address, 6, 4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (connectors.length === 0) {
    return (
      <p className="text-muted-foreground/60 text-[11px]">
        No Ethereum wallets detected.
      </p>
    );
  }

  return (
    <>
      <WcQrModal uri={uri} onClose={clearUri} />

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
              <>
                <div className="bg-border h-px w-full" />
                <SectionLabel>More options</SectionLabel>
              </>
            )}
            <WalletRow
              icon={<Usb className="text-muted-foreground h-6 w-6" />}
              name="Ledger"
              subtitle="Connect via Ledger Live"
              isLoading={connectingId === wcConnector.id && wcIntent === "ledger"}
              disabled={isAnyConnecting}
              onClick={() => handleConnect(wcConnector, "ledger")}
            />
            <WalletRow
              icon={<QrCode className="text-muted-foreground h-6 w-6" />}
              name="WalletConnect"
              subtitle="Scan QR with any mobile wallet"
              isLoading={connectingId === wcConnector.id && wcIntent === "walletconnect"}
              disabled={isAnyConnecting}
              onClick={() => handleConnect(wcConnector, "walletconnect")}
            />
          </div>
        )}
      </div>
    </>
  );
}
