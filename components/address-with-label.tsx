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
    : `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {label ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-1.5 rounded-md px-2 py-1"
                style={{
                  backgroundColor: `${label.color}20`,
                  borderLeft: `3px solid ${label.color}`,
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: label.color }}
                >
                  {label.label}
                </span>
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
      ) : (
        <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
          {displayAddress}
        </code>
      )}

      <div className="flex items-center gap-0.5">
        {showCopy && (
          <Copy
            className="text-muted-foreground hover:text-foreground h-3 w-3 shrink-0 cursor-pointer transition-colors"
            onClick={handleCopy}
          />
        )}

        {shouldShowLabelButton && (
          <AddressLabelManagerDialog defaultAddress={address}>
            <Tag className="text-muted-foreground hover:text-foreground h-3 w-3 shrink-0 cursor-pointer transition-colors" />
          </AddressLabelManagerDialog>
        )}
      </div>
    </div>
  );
}
