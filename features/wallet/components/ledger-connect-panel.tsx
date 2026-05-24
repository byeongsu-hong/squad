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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ledgerService } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { formatAddress } from "@/lib/utils/format-address";
import { useChainStore } from "@/stores/chain-store";
import { useWalletStore } from "@/stores/wallet-store";
import {
  ACCOUNTS_PER_PAGE,
  DERIVATION_PATH_PATTERNS,
  DerivationPathType,
  type LedgerAccount,
  getDerivationPath,
  parseLedgerError,
} from "@/types/wallet";

interface LedgerConnectPanelProps {
  onBack: () => void;
  onClose: () => void;
}

export function LedgerConnectPanel({
  onBack,
  onClose,
}: LedgerConnectPanelProps) {
  const [step, setStep] = useState<"connect" | "select">("connect");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pathType, setPathType] = useState<DerivationPathType>(
    DerivationPathType.BIP44_CHANGE
  );

  const { connectLedger } = useWalletStore();
  const { getSelectedChain } = useChainStore();

  const loadAccounts = async (page: number) => {
    const chain = getSelectedChain();
    if (!chain) throw new Error("No chain selected");

    const paths = Array.from({ length: ACCOUNTS_PER_PAGE }, (_, i) =>
      getDerivationPath(page * ACCOUNTS_PER_PAGE + i, pathType)
    );

    const loaded = await ledgerService.getAccounts(paths, chain.rpcUrl);
    setAccounts(loaded);
    setCurrentPage(page);
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await ledgerService.connect();
      await loadAccounts(0);
      setStep("select");
    } catch (err) {
      setError(parseLedgerError(err));
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
      setError(parseLedgerError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (account: LedgerAccount) => {
    connectLedger(account.publicKey, account.derivationPath, "Ledger");
    toast.success("Wallet connected");
    onClose();
  };

  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground mb-6 -ml-1.5 h-auto justify-start gap-1.5 px-1.5 py-1 text-sm"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to wallets
      </Button>

      {step === "connect" && (
        <div className="flex flex-col items-center gap-6">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full",
              error ? "bg-destructive/10" : "bg-primary/10"
            )}
          >
            {error ? (
              <AlertCircle className="text-destructive h-10 w-10" />
            ) : (
              <Usb className="text-primary h-10 w-10" />
            )}
          </div>

          <div className="space-y-1.5 text-center">
            <h3 className="text-base font-semibold">
              {error ? "Connection Failed" : "Connect Ledger Device"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {error
                ? error
                : "Connect your Ledger device and open the Solana app, then click connect."}
            </p>
          </div>

          <div className="border-border bg-muted w-full space-y-3 rounded-xl border p-4">
            <p className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-widest">
              Derivation Path
            </p>
            <RadioGroup
              value={pathType}
              onValueChange={(value) =>
                setPathType(value as DerivationPathType)
              }
              disabled={loading}
              className="space-y-2"
            >
              {Object.entries(DERIVATION_PATH_PATTERNS).map(
                ([type, pattern]) => (
                  <div key={type} className="flex items-start gap-3">
                    <RadioGroupItem
                      value={type}
                      id={`path-${type}`}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`path-${type}`}
                      className={cn(
                        "flex cursor-pointer flex-col gap-0.5",
                        loading && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="text-sm leading-none font-medium">
                        {pattern.name}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {pattern.description}
                      </span>
                    </Label>
                  </div>
                )
              )}
            </RadioGroup>
          </div>

          <Button onClick={handleConnect} disabled={loading} className="w-full">
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
            <h3 className="text-base font-semibold">Select Account</h3>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                Page {currentPage + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0 || loading}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={loading}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
              <p className="text-muted-foreground text-sm">
                Loading accounts...
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((account, index) => {
                const accountNumber =
                  currentPage * ACCOUNTS_PER_PAGE + index + 1;
                const address = account.publicKey.toBase58();
                return (
                  <Button
                    key={account.derivationPath}
                    variant="outline"
                    onClick={() => handleSelectAccount(account)}
                    className="group hover:border-primary/30 hover:bg-accent/50 h-auto w-full items-center justify-between rounded-xl px-4 py-3.5 text-left"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-xs font-medium"
                        >
                          {accountNumber}
                        </Badge>
                        <span className="font-mono text-sm font-medium">
                          {formatAddress(address, 6, 6)}
                        </span>
                      </div>
                      <span className="text-muted-foreground pl-0.5 font-mono text-xs">
                        {account.derivationPath}
                      </span>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                      {account.balance !== undefined && (
                        <span className="text-sm font-semibold tabular-nums">
                          {account.balance.toFixed(4)} SOL
                        </span>
                      )}
                      <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
