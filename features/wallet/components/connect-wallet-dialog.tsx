"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

export function ConnectWalletDialog({
  open,
  onOpenChange,
  defaultTab,
}: ConnectWalletDialogProps) {
  const [view, setView] = useState<ViewType>("tabs");
  const [activeTab, setActiveTab] = useState<TabType>("solana");

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab ?? "solana");
      setView("tabs");
    }
  }, [open, defaultTab]);

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
                  onOpenLedger={() => setView("solana-ledger")}
                />
              ) : (
                <EvmConnectPanel
                  onClose={() => handleOpenChange(false)}
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
