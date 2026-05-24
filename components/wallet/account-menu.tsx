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
import { cn } from "@/lib/utils";
import { formatAddress } from "@/lib/utils/format-address";
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
        <button
          className={cn(
            "border-border bg-card flex items-center gap-2 rounded-full border",
            "text-muted-foreground px-3.5 py-1.5 font-mono text-[12px] shadow-sm",
            "hover:bg-muted hover:border-border/80 transition-all hover:shadow-none",
            "focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          )}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
          {primaryLabel}
          <ChevronDown className="text-muted-foreground/60 h-3 w-3" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-1.5">
        <DropdownMenuLabel className="text-foreground px-2 py-1.5 text-xs font-semibold">
          Wallets
        </DropdownMenuLabel>

        {hasSolanaWallet && (
          <DropdownMenuItem
            className="flex cursor-default items-start gap-3 rounded-md p-3 focus:bg-transparent"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Globe className="text-primary h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium">
                  {walletName ?? "Solana Wallet"}
                </p>
                <span className="text-muted-foreground bg-muted shrink-0 rounded px-1.5 py-0.5 font-sans text-[10px]">
                  SVM
                </span>
              </div>
              <p className="text-muted-foreground truncate font-mono text-xs">
                {formatAddress(publicKey.toString(), 8, 6)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copySolana();
                  }}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
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
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
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
            <div className="bg-primary/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <PlugZap className="text-primary h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium">
                  {connector?.name ?? "Ethereum Wallet"}
                </p>
                <span className="text-muted-foreground bg-muted shrink-0 rounded px-1.5 py-0.5 font-sans text-[10px]">
                  EVM
                </span>
              </div>
              <p className="text-muted-foreground truncate font-mono text-xs">
                {formatAddress(evmAddress, 8, 6)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyEvm();
                  }}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
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
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
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
            <DropdownMenuLabel className="text-muted-foreground px-2 py-1 pt-0 text-xs font-normal">
              Add another
            </DropdownMenuLabel>

            {!hasSolanaWallet && (
              <DropdownMenuItem
                onClick={() => onAddWallet("solana")}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2"
              >
                <div className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                  <Plus className="text-muted-foreground h-3.5 w-3.5" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  <span className="text-sm">Solana Wallet</span>
                </div>
              </DropdownMenuItem>
            )}

            {!hasEvmWallet && (
              <DropdownMenuItem
                onClick={() => onAddWallet("ethereum")}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2"
              >
                <div className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                  <Plus className="text-muted-foreground h-3.5 w-3.5" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <PlugZap className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  <span className="text-sm">Ethereum Wallet</span>
                </div>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Disconnect All</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
