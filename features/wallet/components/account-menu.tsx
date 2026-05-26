"use client";

import {
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  LogOut,
  PlugZap,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatAddress } from "@/lib/utils/format-address";
import { useWalletStore } from "@/stores/wallet-store";

import { useWalletDisconnect } from "../hooks/use-wallet-disconnect";

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
    try {
      await disconnect();
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  const allWalletsConnected = hasSolanaWallet && hasEvmWallet;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "rounded-full px-3.5 py-1.5 h-auto font-mono text-[12px]",
            "text-foreground shadow-sm hover:shadow-none"
          )}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          {primaryLabel}
          <ChevronDown className="text-muted-foreground/60 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-1.5">
        <DropdownMenuLabel className="text-muted-foreground/50 px-2 py-1.5 text-[11px] font-medium">
          Wallets
        </DropdownMenuLabel>

        {hasSolanaWallet && (
          <DropdownMenuItem
            className="flex cursor-default items-start gap-3 rounded-md p-3 focus:bg-transparent"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="bg-primary/10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <Globe className="text-primary h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13px] font-medium">
                  {walletName ?? "Solana Wallet"}
                </p>
                <span className="border-primary/30 bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 font-sans text-[10px]">
                  SVM
                </span>
              </div>
              <p className="text-muted-foreground/60 truncate font-mono text-xs">
                {formatAddress(publicKey.toString(), 8, 6)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground/60 hover:text-muted-foreground h-auto gap-1 p-0 text-[11px] font-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    copySolana();
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
                <span className="text-muted-foreground/50">·</span>
                <a
                  href={`https://solscan.io/account/${publicKey.toString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground/60 hover:text-muted-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
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
            className="flex cursor-default items-start gap-3 rounded-md p-3 focus:bg-transparent"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <PlugZap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[13px] font-medium">
                  {connector?.name ?? "Ethereum Wallet"}
                </p>
                <span className="border-blue-300/50 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-400 shrink-0 rounded px-1.5 py-0.5 font-sans text-[10px]">
                  EVM
                </span>
              </div>
              <p className="text-muted-foreground/60 truncate font-mono text-xs">
                {formatAddress(evmAddress, 8, 6)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground/60 hover:text-muted-foreground h-auto gap-1 p-0 text-[11px] font-normal"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyEvm();
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
                <span className="text-muted-foreground/50">·</span>
                <a
                  href={`https://etherscan.io/address/${evmAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground/60 hover:text-muted-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
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
            <DropdownMenuLabel className="text-muted-foreground/50 px-2 py-1.5 text-[11px] font-medium">
              Add another
            </DropdownMenuLabel>

            {!hasSolanaWallet && (
              <DropdownMenuItem
                onClick={() => onAddWallet("solana")}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2"
              >
                <div className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                  <Globe className="text-muted-foreground h-3.5 w-3.5" />
                </div>
                <span className="min-w-0 flex-1 text-[13px]">Solana Wallet</span>
              </DropdownMenuItem>
            )}

            {!hasEvmWallet && (
              <DropdownMenuItem
                onClick={() => onAddWallet("ethereum")}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2"
              >
                <div className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                  <PlugZap className="text-muted-foreground h-3.5 w-3.5" />
                </div>
                <span className="min-w-0 flex-1 text-[13px]">Ethereum Wallet</span>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="text-[13px]">Disconnect All</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
