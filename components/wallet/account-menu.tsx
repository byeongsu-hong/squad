"use client";

import {
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  LogOut,
  PlugZap,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletDisconnect } from "@/lib/hooks/use-wallet-disconnect";
import { formatAddress } from "@/lib/utils/format-address";
import { cn } from "@/lib/utils";
import { useWalletStore } from "@/stores/wallet-store";

interface AccountMenuProps {
  onAddWallet: (tab?: "solana" | "ethereum") => void;
}

export function AccountMenu({ onAddWallet }: AccountMenuProps) {
  const { connected, publicKey, walletName } = useWalletStore();
  const {
    address: evmAddress,
    isConnected: evmConnected,
    connector,
  } = useAccount();
  const { disconnect } = useWalletDisconnect();

  const hasSolanaWallet = connected && publicKey;
  const hasEvmWallet = evmConnected && evmAddress;

  const primaryLabel = hasSolanaWallet
    ? formatAddress(publicKey.toString(), 4, 4)
    : hasEvmWallet
      ? formatAddress(evmAddress, 6, 4)
      : "...";

  function copySolana() {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toString()).then(
      () => toast.success("Solana address copied"),
      () => toast.error("Failed to copy address")
    );
  }

  function copyEvm() {
    if (!evmAddress) return;
    navigator.clipboard.writeText(evmAddress).then(
      () => toast.success("EVM address copied"),
      () => toast.error("Failed to copy address")
    );
  }

  async function handleDisconnect() {
    await disconnect();
  }

  const allWalletsConnected = hasSolanaWallet && hasEvmWallet;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full border border-border bg-card",
            "px-3.5 py-1.5 text-[12px] font-mono text-muted-foreground shadow-sm",
            "transition-all hover:bg-muted hover:border-border/80 hover:shadow-none",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          {primaryLabel}
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-1.5">
        <DropdownMenuLabel className="text-xs font-semibold text-foreground px-2 py-1.5">
          Wallets
        </DropdownMenuLabel>

        {hasSolanaWallet && (
          <DropdownMenuItem
            className="flex items-start gap-3 p-3 cursor-default focus:bg-transparent rounded-md"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">
                  {walletName ?? "Solana Wallet"}
                </p>
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-sans shrink-0">
                  SVM
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground truncate">
                {formatAddress(publicKey.toString(), 8, 6)}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copySolana();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
                <span className="text-muted-foreground/30">·</span>
                <a
                  href={`https://solscan.io/account/${publicKey.toString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Explorer
                </a>
              </div>
            </div>
          </DropdownMenuItem>
        )}

        {hasEvmWallet && (
          <DropdownMenuItem
            className="flex items-start gap-3 p-3 cursor-default focus:bg-transparent rounded-md"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
              <PlugZap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">
                  {connector?.name ?? "Ethereum Wallet"}
                </p>
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-sans shrink-0">
                  EVM
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground truncate">
                {formatAddress(evmAddress, 8, 6)}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyEvm();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
                <span className="text-muted-foreground/30">·</span>
                <a
                  href={`https://etherscan.io/address/${evmAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Explorer
                </a>
              </div>
            </div>
          </DropdownMenuItem>
        )}

        {!allWalletsConnected && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1 pt-0">
              Add another
            </DropdownMenuLabel>

            {!hasSolanaWallet && (
              <DropdownMenuItem
                onClick={() => onAddWallet("solana")}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm">Solana Wallet</span>
                </div>
              </DropdownMenuItem>
            )}

            {!hasEvmWallet && (
              <DropdownMenuItem
                onClick={() => onAddWallet("ethereum")}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <PlugZap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm">Ethereum Wallet</span>
                </div>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Disconnect All</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
