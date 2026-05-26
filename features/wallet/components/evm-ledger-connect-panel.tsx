"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Usb,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useConnect } from "wagmi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type EthereumLedgerAccount,
  ethereumLedgerService,
  parseEthereumLedgerError,
} from "@/lib/ledger/ethereum";
import { EVM_LEDGER_DERIVATION_PATH_PATTERN } from "@/lib/ledger/ethereum-paths";
import { cn } from "@/lib/utils";
import { formatAddress } from "@/lib/utils/format-address";
import { ACCOUNTS_PER_PAGE } from "@/types/wallet";

import { createEvmLedgerConnector } from "../lib/evm-ledger-connector";

interface EvmLedgerConnectPanelProps {
  onBack: () => void;
  onClose: () => void;
}

export function EvmLedgerConnectPanel({
  onBack,
  onClose,
}: EvmLedgerConnectPanelProps) {
  const { connect } = useConnect();
  const [step, setStep] = useState<"connect" | "select">("connect");
  const [loading, setLoading] = useState(false);
  const [connectingPath, setConnectingPath] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<EthereumLedgerAccount[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isBusy = loading || connectingPath !== null;

  const loadAccounts = async (page: number) => {
    const indexes = Array.from(
      { length: ACCOUNTS_PER_PAGE },
      (_, i) => page * ACCOUNTS_PER_PAGE + i
    );
    const loaded = await ethereumLedgerService.getAccounts(indexes);
    setAccounts(loaded);
    setCurrentPage(page);
  };

  const handleConnectDevice = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadAccounts(0);
      setStep("select");
    } catch (err) {
      setError(parseEthereumLedgerError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      await loadAccounts(page);
    } catch (err) {
      setError(parseEthereumLedgerError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (account: EthereumLedgerAccount) => {
    setConnectingPath(account.derivationPath);
    setError(null);
    connect(
      {
        connector: createEvmLedgerConnector({ account }),
      } as never,
      {
        onSuccess: () => {
          toast.success("Connected to Ledger USB");
          setConnectingPath(null);
          onClose();
        },
        onError: (err) => {
          const message = parseEthereumLedgerError(err);
          setError(message);
          toast.error(message);
          setConnectingPath(null);
        },
      }
    );
  };

  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground mb-6 -ml-1.5 h-auto justify-start gap-1.5 px-1.5 py-1 text-[13px]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to wallets
      </Button>

      {step === "connect" && (
        <div className="flex flex-col items-center gap-6">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl",
              error ? "bg-destructive/10" : "bg-blue-500/10"
            )}
          >
            {error ? (
              <AlertCircle className="text-destructive h-8 w-8" />
            ) : (
              <Usb className="h-8 w-8 text-blue-500" />
            )}
          </div>

          <div className="space-y-1.5 text-center">
            <h3 className="text-[15px] font-semibold">
              {error ? "Connection Failed" : "Connect Ethereum Ledger"}
            </h3>
            <p
              className={cn(
                "text-[13px]",
                error ? "text-destructive" : "text-muted-foreground/60"
              )}
            >
              {error
                ? error
                : "Connect your Ledger device and open the Ethereum app, then click connect."}
            </p>
          </div>

          <div className="border-border bg-muted w-full space-y-2 rounded-xl border p-4">
            <p className="text-muted-foreground/50 text-[11px] font-medium">
              Derivation Path
            </p>
            <p className="text-muted-foreground/70 font-mono text-xs">
              {EVM_LEDGER_DERIVATION_PATH_PATTERN}
            </p>
          </div>

          <Button
            onClick={handleConnectDevice}
            disabled={loading}
            className="w-full border-blue-500/20 bg-blue-600 text-white hover:bg-blue-600/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : error ? (
              "Retry Connection"
            ) : (
              "Connect Ledger"
            )}
          </Button>
        </div>
      )}

      {step === "select" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Select EVM Account</h3>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/60 text-[11px]">
                Page {currentPage + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-7 w-7"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0 || isBusy}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-7 w-7"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={isBusy}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <p className="text-muted-foreground/60 text-[11px]">
                Loading accounts...
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-muted-foreground/60 rounded-xl border border-dashed px-4 py-8 text-center text-[12px]">
              No accounts found for this page.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((account) => (
                <Button
                  key={account.derivationPath}
                  variant="outline"
                  onClick={() => handleSelectAccount(account)}
                  disabled={isBusy}
                  className="group hover:bg-muted h-auto w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left hover:border-blue-500/30"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-xs font-medium"
                      >
                        {account.index + 1}
                      </Badge>
                      <span className="font-mono text-[13px] font-medium">
                        {formatAddress(account.address, 6, 6)}
                      </span>
                    </div>
                    <span className="text-muted-foreground/60 pl-0.5 font-mono text-xs">
                      {account.displayPath}
                    </span>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center">
                    {connectingPath === account.derivationPath ? (
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
