"use client";

import { AlertCircle, CheckCircle2, QrCode, Usb, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect } from "wagmi";
import type { Connector } from "wagmi";

import { Button } from "@/components/ui/button";
import { formatEvmLedgerDerivationPath } from "@/lib/ledger/ethereum-paths";
import { formatAddress } from "@/lib/utils/format-address";

import { OKX_EXTENSION_URL } from "../assets/okx-icon";
import { isWalletConnectionCancellation } from "../lib/wallet-errors";
import { WALLETCONNECT_UNCONFIGURED_MESSAGE } from "../lib/walletconnect";
import {
  prepareWalletConnectModalState,
  subscribeWalletConnectModalClose,
  waitForWalletConnectHostRelease,
} from "../lib/walletconnect-appkit";
import {
  DetectedBadge,
  SectionLabel,
  WalletIcon,
  WalletRow,
} from "./wallet-row";

interface EvmConnectPanelProps {
  onBeginWalletConnect?: () => Promise<void> | void;
  onClose: () => void;
  onEndWalletConnect?: (result: { reopen: boolean }) => void;
  onOpenLedger: () => void;
}

function isWalletConnect(connector: Connector) {
  return (
    connector.id === "walletConnect" ||
    connector.type === "walletConnect" ||
    connector.name.toLowerCase().includes("walletconnect")
  );
}

function isGenericInjected(connector: Connector) {
  return connector.id === "injected" && connector.name === "Injected";
}

function isOkxConnector(connector: Connector) {
  const value = `${connector.id} ${connector.name}`.toLowerCase();
  return value.includes("okx") || value.includes("okex");
}

function hasOkxEvmProvider() {
  return (
    typeof window !== "undefined" &&
    typeof window.okxwallet?.request === "function"
  );
}

function connectorKey(connector: Connector) {
  if (isOkxConnector(connector)) return "okx";
  const rdns = connector.rdns;
  if (typeof rdns === "string") return rdns.toLowerCase();
  if (rdns) return rdns.join("|").toLowerCase();
  return connector.name.toLowerCase();
}

function connectorPriority(connector: Connector) {
  if (isOkxConnector(connector) && connector.id === "okxWallet") return 0;
  return 1;
}

function getInlineConnectors(connectors: readonly Connector[]) {
  const byKey = new Map<string, Connector>();
  for (const connector of connectors) {
    if (
      isWalletConnect(connector) ||
      isGenericInjected(connector) ||
      isOkxConnector(connector)
    ) {
      continue;
    }

    const key = connectorKey(connector);
    const existing = byKey.get(key);
    if (
      !existing ||
      connectorPriority(connector) > connectorPriority(existing)
    ) {
      byKey.set(key, connector);
    }
  }
  return Array.from(byKey.values());
}

function getOkxConnector(connectors: readonly Connector[]) {
  return (
    connectors.find(
      (connector) => isOkxConnector(connector) && connector.id === "okxWallet"
    ) ?? connectors.find((connector) => isOkxConnector(connector))
  );
}

export function EvmConnectPanel({
  onBeginWalletConnect,
  onClose,
  onEndWalletConnect,
  onOpenLedger,
}: EvmConnectPanelProps) {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors } = useConnect();
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isAnyConnecting = connectingId != null;

  const inlineConnectors = getInlineConnectors(connectors);
  const okxConnector = getOkxConnector(connectors);
  const wcConnector = connectors.find((c) => isWalletConnect(c));
  const wcConnectorId = wcConnector?.id;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!wcConnectorId || connectingId !== wcConnectorId) return;

    let disposed = false;
    let unsubscribe: () => void = () => undefined;

    void subscribeWalletConnectModalClose(() => {
      setConnectingId((current) =>
        current === wcConnectorId ? null : current
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
  }, [connectingId, wcConnectorId]);

  const handleConnect = (connector: Connector) => {
    setError(null);
    setConnectingId(connector.id);
    connect(
      { connector },
      {
        onSuccess: () => {
          setConnectingId(null);
          toast.success(`Connected to ${connector.name}`);
          onClose();
        },
        onError: (err) => {
          setConnectingId(null);
          if (isWalletConnectionCancellation(err)) return;
          const message = err.message ?? "Failed to connect";
          setError(message);
          toast.error(message);
        },
      }
    );
  };

  const handleWalletConnect = async () => {
    if (!wcConnector) {
      setError(WALLETCONNECT_UNCONFIGURED_MESSAGE);
      toast.error(WALLETCONNECT_UNCONFIGURED_MESSAGE);
      return;
    }
    setError(null);
    setConnectingId(wcConnector.id);
    await prepareWalletConnectModalState("eip155");
    if (onBeginWalletConnect) {
      await onBeginWalletConnect();
    } else {
      onClose();
    }
    await waitForWalletConnectHostRelease();
    connect(
      { connector: wcConnector },
      {
        onSuccess: () => {
          if (isMountedRef.current) setConnectingId(null);
          onEndWalletConnect?.({ reopen: false });
          toast.success(`Connected to ${wcConnector.name}`);
        },
        onError: (err) => {
          if (isMountedRef.current) setConnectingId(null);
          if (isWalletConnectionCancellation(err)) {
            onEndWalletConnect?.({ reopen: true });
            return;
          }
          const message = err.message ?? "Failed to connect";
          if (isMountedRef.current) setError(message);
          onEndWalletConnect?.({ reopen: true });
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

      <div className="flex flex-col gap-2">
        <SectionLabel>Wallets</SectionLabel>
        {inlineConnectors.length > 0 ? (
          inlineConnectors.map((connector) => {
            const shouldInstallOkx =
              connector.id === "okxWallet" && !hasOkxEvmProvider();
            return (
              <WalletRow
                key={connector.id}
                icon={
                  <WalletIcon icon={connector.icon} name={connector.name} />
                }
                name={connector.name}
                subtitle={
                  shouldInstallOkx ? "Install extension" : <DetectedBadge />
                }
                isLoading={connectingId === connector.id}
                disabled={isAnyConnecting}
                onClick={
                  shouldInstallOkx
                    ? () => window.open(OKX_EXTENSION_URL, "_blank", "noopener")
                    : () => handleConnect(connector)
                }
              />
            );
          })
        ) : (
          <p className="text-muted-foreground/60 text-[11px]">
            No browser wallets detected.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="bg-border h-px w-full" />
        <SectionLabel>More options</SectionLabel>
        <WalletRow
          icon={<Usb className="text-muted-foreground h-6 w-6" />}
          name="Ledger USB"
          subtitle={`Ethereum app · ${formatEvmLedgerDerivationPath(0)}`}
          disabled={isAnyConnecting}
          onClick={onOpenLedger}
        />
        {okxConnector && (
          <WalletRow
            icon={
              <WalletIcon icon={okxConnector.icon} name={okxConnector.name} />
            }
            name={okxConnector.name}
            subtitle={
              okxConnector.id === "okxWallet" && !hasOkxEvmProvider() ? (
                "Install extension"
              ) : (
                <DetectedBadge />
              )
            }
            isLoading={connectingId === okxConnector.id}
            disabled={isAnyConnecting}
            onClick={
              okxConnector.id === "okxWallet" && !hasOkxEvmProvider()
                ? () => window.open(OKX_EXTENSION_URL, "_blank", "noopener")
                : () => handleConnect(okxConnector)
            }
          />
        )}
        <WalletRow
          icon={<QrCode className="text-muted-foreground h-6 w-6" />}
          name="WalletConnect"
          subtitle={
            wcConnector ? "Open WalletConnect modal" : "Project id required"
          }
          isLoading={connectingId === wcConnector?.id}
          disabled={isAnyConnecting}
          onClick={handleWalletConnect}
        />
      </div>
    </div>
  );
}
