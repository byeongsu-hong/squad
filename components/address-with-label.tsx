"use client";

import { Copy, Tag } from "lucide-react";
import { toast } from "sonner";

import { AddressLabelManagerDialog } from "@/components/address-label-manager-dialog";
import { Button } from "@/components/ui/button";
import { useAddressLabel } from "@/lib/hooks/use-address-label";
import { cn } from "@/lib/utils";
import { formatAddress } from "@/lib/utils/format-address";

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
    toast.success("Address copied");
  };

  const displayAddress = showFull ? address : formatAddress(address, 6, 6);
  const interactiveDisplayClass = copyOnClick
    ? "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border"
    : "";

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {label ? (
        copyOnClick ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleCopy}
            aria-label="Copy address"
            title={address}
            className={cn(
              "h-auto min-w-0 p-0 hover:bg-transparent text-left",
              showFull ? "flex-col items-start gap-1" : "items-center gap-2",
              interactiveDisplayClass
            )}
          >
            <div className="border-border bg-muted text-foreground inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="truncate">{label.label}</span>
            </div>
            {showFull ? (
              <code className="text-muted-foreground hover:text-foreground max-w-full truncate font-mono text-xs tabular-nums transition-colors">
                {address}
              </code>
            ) : null}
          </Button>
        ) : (
          <div
            className={cn(
              "flex min-w-0",
              showFull ? "flex-col items-start gap-1" : "items-center gap-2"
            )}
            title={`${label.label}${label.description ? `\n${label.description}` : ""}\n${address}`}
          >
            <div className="border-border bg-muted text-foreground inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="truncate">{label.label}</span>
            </div>
            {showFull ? (
              <code className="text-muted-foreground/60 max-w-full truncate font-mono text-xs tabular-nums">
                {address}
              </code>
            ) : null}
          </div>
        )
      ) : copyOnClick ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          aria-label="Copy address"
          title={address}
          className={cn(
            "bg-muted h-auto rounded-md px-2 py-1 font-mono text-xs text-foreground/80 hover:text-foreground",
            interactiveDisplayClass
          )}
        >
          {displayAddress}
        </Button>
      ) : (
        <code
          className="border-border bg-muted text-foreground/80 rounded-md border px-2 py-1 font-mono text-xs"
          title={address}
        >
          {displayAddress}
        </code>
      )}

      <div className="flex items-center gap-0.5">
        {showCopy && (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0 p-0"
            onClick={handleCopy}
            aria-label="Copy address"
            title="Copy address"
          >
            <Copy className="h-3 w-3 shrink-0" />
          </Button>
        )}

        {shouldShowLabelButton && (
          <AddressLabelManagerDialog defaultAddress={address}>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-6 w-6 shrink-0 p-0"
              aria-label="Label address"
              title="Label address"
            >
              <Tag className="h-3 w-3 shrink-0" />
            </Button>
          </AddressLabelManagerDialog>
        )}
      </div>
    </div>
  );
}
