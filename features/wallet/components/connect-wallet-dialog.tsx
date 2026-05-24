"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { EvmConnectPanel } from "./evm-connect-panel";
import { LedgerConnectPanel } from "./ledger-connect-panel";
import { SolanaConnectPanel } from "./solana-connect-panel";

interface ConnectWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "solana" | "ethereum";
}

type ViewType = "tabs" | "ledger";
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
            {view === "ledger" ? "Connect Ledger" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {view === "ledger"
              ? "Connect your Ledger hardware wallet to Solana"
              : "Select a network and connect your wallet"}
          </DialogDescription>
        </DialogHeader>

        {view === "tabs" ? (
          <div className="flex flex-col gap-3">
            <div
              role="tablist"
              className="bg-muted flex items-center gap-0.5 rounded-lg p-1"
            >
              {(["solana", "ethereum"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "solana" ? "Solana" : "Ethereum"}
                </button>
              ))}
            </div>

            <div className="mt-1">
              {activeTab === "solana" ? (
                <SolanaConnectPanel
                  onClose={() => handleOpenChange(false)}
                  onOpenLedger={() => setView("ledger")}
                />
              ) : (
                <EvmConnectPanel onClose={() => handleOpenChange(false)} />
              )}
            </div>
          </div>
        ) : (
          <LedgerConnectPanel
            onBack={() => setView("tabs")}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
