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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ledgerService } from "@/lib/ledger";
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
import { formatAddress } from "@/lib/utils/format-address";

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "connect" | "select";

export function WalletConnectDialog({
  open,
  onOpenChange,
}: WalletConnectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [step, setStep] = useState<Step>("connect");
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pathType, setPathType] = useState<DerivationPathType>(
    DerivationPathType.BIP44_CHANGE
  );

  const { connectLedger } = useWalletStore();
  const { getSelectedChain } = useChainStore();

  const loadAccounts = async (page: number) => {
    const chain = getSelectedChain();
    if (!chain) {
      throw new Error("No chain selected");
    }

    const startIndex = page * ACCOUNTS_PER_PAGE;
    const paths = Array.from({ length: ACCOUNTS_PER_PAGE }, (_, i) =>
      getDerivationPath(startIndex + i, pathType)
    );

    const loadedAccounts = await ledgerService.getAccounts(paths, chain.rpcUrl);
    setAccounts(loadedAccounts);
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      await ledgerService.connect();
      await loadAccounts(0);
      setStep("select");
      toast.success("Ledger connected successfully");
    } catch (err) {
      const errorMessage = parseLedgerError(err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    setLoading(true);

    try {
      await loadAccounts(newPage);
      setCurrentPage(newPage);
    } catch (err) {
      toast.error(parseLedgerError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (account: LedgerAccount) => {
    connectLedger(account.publicKey, account.derivationPath, "Ledger");
    onOpenChange(false);
    resetDialog();
    toast.success("Wallet connected");
  };

  const resetDialog = () => {
    setStep("connect");
    setAccounts([]);
    setCurrentPage(0);
    setError(null);
    setPathType(DerivationPathType.BIP44_CHANGE);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Connect Ledger Wallet</DialogTitle>
          <DialogDescription>
            {step === "connect"
              ? "Connect your Ledger device to continue"
              : "Select an account to use"}
          </DialogDescription>
        </DialogHeader>

        {step === "connect" && (
          <ConnectStep
            loading={loading}
            error={error}
            pathType={pathType}
            onPathTypeChange={setPathType}
            onConnect={handleConnect}
          />
        )}

        {step === "select" && (
          <SelectStep
            loading={loading}
            accounts={accounts}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onSelectAccount={handleSelectAccount}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ConnectStepProps {
  loading: boolean;
  error: string | null;
  pathType: DerivationPathType;
  onPathTypeChange: (type: DerivationPathType) => void;
  onConnect: () => void;
}

function ConnectStep({
  loading,
  error,
  pathType,
  onPathTypeChange,
  onConnect,
}: ConnectStepProps) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-col items-center gap-6">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full ${
            error ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {error ? (
            <AlertCircle className="text-destructive h-10 w-10" />
          ) : (
            <Usb className="text-primary h-10 w-10" />
          )}
        </div>
        <div className="text-center">
          <h3 className="font-semibold">
            {error ? "Connection Failed" : "Connect Your Ledger"}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {error ||
              "Make sure your Ledger device is unlocked and the Solana app is open"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Derivation Path</Label>
        <RadioGroup
          value={pathType}
          onValueChange={(value) =>
            onPathTypeChange(value as DerivationPathType)
          }
          disabled={loading}
        >
          {Object.entries(DERIVATION_PATH_PATTERNS).map(([key, pattern]) => (
            <div key={key} className="flex items-center space-x-2">
              <RadioGroupItem value={key} id={key} disabled={loading} />
              <Label htmlFor={key} className="font-normal">
                <div className="flex flex-col">
                  <span className="font-medium">{pattern.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {pattern.description}
                  </span>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Button onClick={onConnect} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : error ? (
          "Try Again"
        ) : (
          "Connect Ledger"
        )}
      </Button>
    </div>
  );
}

interface SelectStepProps {
  loading: boolean;
  accounts: LedgerAccount[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelectAccount: (account: LedgerAccount) => void;
}

function SelectStep({
  loading,
  accounts,
  currentPage,
  onPageChange,
  onSelectAccount,
}: SelectStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Page {currentPage + 1}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {accounts.map((account, index) => (
          <button
            key={account.derivationPath}
            onClick={() => onSelectAccount(account)}
            disabled={loading}
            className="hover:bg-accent flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {formatAddress(account.publicKey.toString(), 8, 8)}
                </span>
                <Badge variant="outline">
                  Account {currentPage * ACCOUNTS_PER_PAGE + index + 1}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {account.derivationPath}
              </p>
            </div>
            {account.balance !== undefined && (
              <div className="text-right">
                <p className="font-semibold">
                  {account.balance.toFixed(4)} SOL
                </p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
