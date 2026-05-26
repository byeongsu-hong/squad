"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { subscribeWalletConnectModalClose } from "../lib/walletconnect-appkit";
import { EvmConnectPanel } from "./evm-connect-panel";
import { EvmLedgerConnectPanel } from "./evm-ledger-connect-panel";
import { LedgerConnectPanel } from "./ledger-connect-panel";
import { SolanaConnectPanel } from "./solana-connect-panel";

interface ConnectWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "solana" | "ethereum";
}

type ViewType = "tabs" | "solana-ledger" | "evm-ledger";
type TabType = "solana" | "ethereum";

const WALLETCONNECT_RESTORE_DELAY_MS = 300;

interface PendingWalletConnectFlow {
  restoreTimer: number | null;
  tab: TabType;
  unsubscribe: () => void;
}

export function ConnectWalletDialog({
  open,
  onOpenChange,
  defaultTab,
}: ConnectWalletDialogProps) {
  const [view, setView] = useState<ViewType>("tabs");
  const [activeTab, setActiveTab] = useState<TabType>("solana");
  const nextOpenTabRef = useRef<TabType | null>(null);
  const pendingWalletConnectFlowRef = useRef<PendingWalletConnectFlow | null>(
    null
  );

  useEffect(() => {
    if (open) {
      setActiveTab(nextOpenTabRef.current ?? defaultTab ?? "solana");
      nextOpenTabRef.current = null;
      setView("tabs");
    }
  }, [open, defaultTab]);

  const clearPendingWalletConnectFlow = useCallback(() => {
    const pendingFlow = pendingWalletConnectFlowRef.current;
    if (!pendingFlow) return;

    pendingFlow.unsubscribe();
    if (pendingFlow.restoreTimer) {
      window.clearTimeout(pendingFlow.restoreTimer);
    }
    pendingWalletConnectFlowRef.current = null;
  }, []);

  const restoreWalletDialog = useCallback(
    (tab: TabType) => {
      clearPendingWalletConnectFlow();
      nextOpenTabRef.current = tab;
      setView("tabs");
      setActiveTab(tab);
      onOpenChange(true);
    },
    [clearPendingWalletConnectFlow, onOpenChange]
  );

  const beginWalletConnectFlow = useCallback(
    async (tab: TabType) => {
      clearPendingWalletConnectFlow();

      const pendingFlow: PendingWalletConnectFlow = {
        restoreTimer: null,
        tab,
        unsubscribe: () => undefined,
      };
      pendingWalletConnectFlowRef.current = pendingFlow;

      const unsubscribe = await subscribeWalletConnectModalClose(() => {
        const currentFlow = pendingWalletConnectFlowRef.current;
        if (currentFlow !== pendingFlow || currentFlow.restoreTimer) return;

        currentFlow.restoreTimer = window.setTimeout(() => {
          if (pendingWalletConnectFlowRef.current === currentFlow) {
            restoreWalletDialog(currentFlow.tab);
          }
        }, WALLETCONNECT_RESTORE_DELAY_MS);
      });

      if (pendingWalletConnectFlowRef.current === pendingFlow) {
        pendingFlow.unsubscribe = unsubscribe;
      } else {
        unsubscribe();
      }

      setView("tabs");
      setActiveTab(tab);
      onOpenChange(false);
    },
    [clearPendingWalletConnectFlow, onOpenChange, restoreWalletDialog]
  );

  const endWalletConnectFlow = useCallback(
    ({ reopen }: { reopen: boolean }) => {
      const pendingFlow = pendingWalletConnectFlowRef.current;
      if (!pendingFlow) return;

      if (reopen) {
        restoreWalletDialog(pendingFlow.tab);
      } else {
        clearPendingWalletConnectFlow();
      }
    },
    [clearPendingWalletConnectFlow, restoreWalletDialog]
  );

  useEffect(
    () => clearPendingWalletConnectFlow,
    [clearPendingWalletConnectFlow]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setView("tabs");
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {view === "tabs"
              ? "Connect Wallet"
              : view === "evm-ledger"
                ? "Connect EVM Ledger"
                : "Connect Solana Ledger"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a Solana, Ethereum, Ledger, or WalletConnect option.
          </DialogDescription>
        </DialogHeader>

        {view === "tabs" ? (
          <div className="flex flex-col gap-3">
            <div
              role="tablist"
              className="bg-muted dark:bg-background flex items-center gap-0.5 rounded-lg p-1"
            >
              {(["solana", "ethereum"] as const).map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "h-auto flex-1 rounded-md py-1.5 text-[13px] font-medium transition-all",
                    activeTab === tab
                      ? tab === "solana"
                        ? "bg-primary/10 dark:bg-primary/15 text-primary hover:bg-primary/15 dark:hover:bg-primary/20 shadow-sm"
                        : "bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-50/80 dark:bg-blue-950/25 dark:text-blue-400 dark:hover:bg-blue-950/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {tab === "solana" ? "Solana" : "Ethereum"}
                </Button>
              ))}
            </div>

            <div className="mt-1">
              {activeTab === "solana" ? (
                <SolanaConnectPanel
                  onClose={() => handleOpenChange(false)}
                  onBeginWalletConnect={() => beginWalletConnectFlow("solana")}
                  onEndWalletConnect={endWalletConnectFlow}
                  onOpenLedger={() => setView("solana-ledger")}
                />
              ) : (
                <EvmConnectPanel
                  onClose={() => handleOpenChange(false)}
                  onBeginWalletConnect={() =>
                    beginWalletConnectFlow("ethereum")
                  }
                  onEndWalletConnect={endWalletConnectFlow}
                  onOpenLedger={() => setView("evm-ledger")}
                />
              )}
            </div>
          </div>
        ) : view === "solana-ledger" ? (
          <LedgerConnectPanel
            onBack={() => setView("tabs")}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <EvmLedgerConnectPanel
            onBack={() => setView("tabs")}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
