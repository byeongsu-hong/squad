"use client";

import { Copy, Tag } from "lucide-react";
import { toast } from "sonner";

import { AddressLabelManagerDialog } from "@/components/address-label-manager-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAddressLabel } from "@/lib/hooks/use-address-label";
import { cn } from "@/lib/utils";

interface AddressWithLabelProps {
  address: string;
  showFull?: boolean;
  showCopy?: boolean;
  showLabelButton?: boolean;
  copyOnClick?: boolean;
  className?: string;
  vaultAddress?: string | null;
}

// Well-known Solana addresses that should be auto-labeled
const WELL_KNOWN_ADDRESSES: Record<
  string,
  { label: string; color: string; description: string }
> = {
  "11111111111111111111111111111111": {
    label: "System Program",
    color: "#8b5cf6",
    description: "Solana System Program",
  },
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: {
    label: "Token Program",
    color: "#8b5cf6",
    description: "SPL Token Program",
  },
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: {
    label: "Token-2022",
    color: "#8b5cf6",
    description: "SPL Token-2022 Program",
  },
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: {
    label: "Associated Token",
    color: "#8b5cf6",
    description: "Associated Token Program",
  },
  SysvarRent111111111111111111111111111111111: {
    label: "Rent Sysvar",
    color: "#6366f1",
    description: "Rent Sysvar",
  },
  SysvarC1ock11111111111111111111111111111111: {
    label: "Clock Sysvar",
    color: "#6366f1",
    description: "Clock Sysvar",
  },
  ComputeBudget111111111111111111111111111111: {
    label: "Compute Budget",
    color: "#8b5cf6",
    description: "Compute Budget Program",
  },
  Vote111111111111111111111111111111111111111: {
    label: "Vote Program",
    color: "#8b5cf6",
    description: "Vote Program",
  },
  Stake11111111111111111111111111111111111111: {
    label: "Stake Program",
    color: "#8b5cf6",
    description: "Stake Program",
  },
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: {
    label: "Metaplex",
    color: "#a855f7",
    description: "Metaplex Token Metadata",
  },
};

export function AddressWithLabel({
  address,
  showFull = false,
  showCopy = true,
  showLabelButton = true,
  copyOnClick = false,
  className,
  vaultAddress,
}: AddressWithLabelProps) {
  const userLabel = useAddressLabel(address);

  // Check if this is a well-known address
  const wellKnownLabel = WELL_KNOWN_ADDRESSES[address];

  // Auto-label vault address
  const isVault = vaultAddress && address === vaultAddress;
  const vaultLabel = isVault
    ? {
        label: "Vault",
        color: "#10b981",
        description: "Multisig vault account",
      }
    : null;

  // Priority: user label > well-known > vault > null
  const label = userLabel || wellKnownLabel || vaultLabel;

  // Hide label button for well-known addresses
  const shouldShowLabelButton =
    showLabelButton && !wellKnownLabel && !vaultLabel;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  const displayAddress = showFull
    ? address
    : `${address.slice(0, 6)}...${address.slice(-6)}`;
  const interactiveDisplayClass = copyOnClick
    ? "transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
    : "";

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {label ? (
        copyOnClick ? (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy address"
            title={address}
            className={cn(
              "flex min-w-0 text-left",
              showFull ? "flex-col items-start gap-1" : "items-center gap-2",
              interactiveDisplayClass
            )}
          >
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="truncate">{label.label}</span>
            </div>
            {showFull ? (
              <code className="max-w-full truncate font-mono text-xs text-zinc-500 tabular-nums transition-colors hover:text-zinc-300">
                {address}
              </code>
            ) : null}
          </button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex min-w-0",
                    showFull
                      ? "flex-col items-start gap-1"
                      : "items-center gap-2"
                  )}
                >
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate">{label.label}</span>
                  </div>
                  {showFull ? (
                    <code className="max-w-full truncate font-mono text-xs text-zinc-500 tabular-nums transition-colors hover:text-zinc-300">
                      {address}
                    </code>
                  ) : null}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{label.label}</p>
                  <p className="text-muted-foreground text-xs">{address}</p>
                  {label.description && (
                    <p className="text-xs">{label.description}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      ) : copyOnClick ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy address"
          title={address}
          className={cn(
            "rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:outline-none",
            interactiveDisplayClass
          )}
        >
          {displayAddress}
        </button>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <code className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100">
                {displayAddress}
              </code>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs tabular-nums">{address}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="flex items-center gap-0.5">
        {showCopy && (
          <button
            type="button"
            className="rounded-sm p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            onClick={handleCopy}
            aria-label="Copy address"
            title="Copy address"
          >
            <Copy className="h-3 w-3 shrink-0" />
          </button>
        )}

        {shouldShowLabelButton && (
          <AddressLabelManagerDialog defaultAddress={address}>
            <button
              type="button"
              className="rounded-sm p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
              aria-label="Label address"
              title="Label address"
            >
              <Tag className="h-3 w-3 shrink-0" />
            </button>
          </AddressLabelManagerDialog>
        )}
      </div>
    </div>
  );
}
