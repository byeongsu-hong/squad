"use client";

import { CheckCircle2, Copy, Check, X, Users, User, ExternalLink, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { OperationsQueue } from "@/components/operations-queue";
import { Button } from "@/components/ui/button";
import { useAddressLabel } from "@/lib/hooks/use-address-label";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { useWalletStore } from "@/stores/wallet-store";
import { useChainStore } from "@/stores/chain-store";
import { normalizeChainConfig } from "@/types/chain";
import type { WorkspaceMultisig } from "@/types/workspace";

interface VaultDetailProps {
  vaultKey: string;
  onBack: () => void;
}

function AddressRow({
  address,
  label,
  labelClassName,
  explorerUrl,
}: {
  address: string;
  label?: string;
  labelClassName?: string;
  explorerUrl?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="group flex items-center gap-1">
      {label && (
        <span className={cn("text-[10px] font-medium w-14 shrink-0", labelClassName)}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="font-mono text-muted-foreground/70 hover:text-muted-foreground/90 text-[11px] transition-colors"
        title={address}
      >
        {truncateAddress(address)}
      </button>
      <div className={cn(
        "shrink-0 transition-colors",
        copied ? "text-primary" : "text-muted-foreground/20 group-hover:text-muted-foreground/60"
      )}>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </div>
      {explorerUrl && (
        <Button
          variant="ghost"
          asChild
          className="text-muted-foreground/20 hover:text-muted-foreground/60 ml-0.5 h-5 w-5 shrink-0 p-0 transition-colors"
          aria-label="View on explorer"
        >
          <a href={`${explorerUrl}/address/${address}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  );
}

function truncateAddress(address: string) {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function formatPermissions(mask: number): string {
  const propose = (mask & 1) !== 0;
  const vote = (mask & 2) !== 0;
  const execute = (mask & 4) !== 0;
  if (propose && vote && execute) return "Full";
  if (propose && vote) return "P+V";
  if (vote && execute) return "V+E";
  if (propose) return "Propose";
  if (vote) return "Vote";
  if (execute) return "Execute";
  return "—";
}

type MemberEntry = WorkspaceMultisig["members"][number];

function MemberRow({ member, isViewer }: { member: MemberEntry; isViewer: boolean }) {
  const addressLabel = useAddressLabel(member.address);
  const labelText = addressLabel?.label ?? null;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(member.address).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1200); },
      () => {}
    );
  };

  const avatarInitial = labelText
    ? labelText.slice(0, 1).toUpperCase()
    : (() => {
        const firstLetter = member.address.split("").find((c) => /[a-zA-Z]/.test(c));
        return firstLetter ? firstLetter.toUpperCase() : null;
      })();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="group -mx-1 flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-muted/40"
          onClick={handleCopy}
        >
          <div className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1",
            isViewer ? "bg-primary/15 text-primary ring-primary/25" : "bg-muted dark:bg-white/[0.07] text-muted-foreground ring-border/60"
          )}>
            {avatarInitial ? (
              <span className="text-[10px] font-semibold">{avatarInitial}</span>
            ) : (
              <User className="h-3 w-3 opacity-60" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {labelText && (
              <p className="truncate text-[12px] font-medium leading-tight">{labelText}</p>
            )}
            <p className={cn("font-mono text-[11px] text-muted-foreground/70", labelText && "leading-tight")}>
              {truncateAddress(member.address)}
            </p>
          </div>
          {isViewer && (
            <span className="shrink-0 rounded bg-primary/10 px-1 py-px text-[9px] font-medium text-primary/80">you</span>
          )}
          {member.permissionsMask !== 7 && (
            <span className="text-muted-foreground/40 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[9px]">
              {formatPermissions(member.permissionsMask)}
            </span>
          )}
          <div className={cn(
            "shrink-0 transition-colors",
            copied ? "text-primary" : "text-muted-foreground/20 group-hover:text-muted-foreground/60"
          )}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={8}>
        <p className="max-w-[240px] break-all font-mono text-[11px]">{member.address}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function VaultDetail({ vaultKey, onBack }: VaultDetailProps) {
  const { publicKey } = useWalletStore();
  const getViewerAddress = useViewerAddressForMultisig();
  const { workspaceMultisigMap } = useWorkspaceMultisigs();
  const { proposals, loading, workspaceMultisigs } = useProposalsQuery();
  const { chains } = useChainStore();

  const multisig = workspaceMultisigMap.get(vaultKey) ?? null;

  const allQueueItems = useWorkspaceQueue({
    workspaceProposals: proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    getViewerAddressForMultisig: (m) => getViewerAddress(m.provider),
  });

  const vaultItems = allQueueItems.filter((i) => i.multisig.key === vaultKey);

  const pendingCount = loading
    ? null
    : vaultItems.filter(
        (i) => !i.proposal.executed && !i.proposal.cancelled
      ).length;
  const needsSigningCount = loading
    ? null
    : vaultItems.filter((i) => i.needsYourSignature && !i.currentUserApproved).length;
  const executableCount = loading
    ? null
    : vaultItems.filter((i) => i.readyToExecute).length;

  const CloseButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onBack}
      className="text-muted-foreground/50 hover:text-foreground"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </Button>
  );

  if (!multisig) {
    return (
      <div>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex w-full justify-end px-2">{CloseButton}</div>
          <p className="text-foreground text-[13px] font-semibold">Vault not found</p>
          <p className="text-muted-foreground/60 text-[11px]">
            It may have been removed from your registry.
          </p>
        </div>
      </div>
    );
  }

  const isSquads = multisig.provider === "squads";
  const viewerAddress = getViewerAddress(multisig.provider);

  const chainConfig = chains.find((c) => normalizeChainConfig(c).id === multisig.chainId);
  const explorerUrl = chainConfig ? normalizeChainConfig(chainConfig).explorerUrl : null;

  return (
    <div>

      {/* Vault header */}
      <div className="pb-4 border-b border-border/50">
        <div className="flex items-start gap-3">
          {/* Vault avatar */}
          <div className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            isSquads
              ? "bg-primary/10 border-primary/20"
              : "border-blue-300/50 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-950/30"
          )}>
            {multisig.label ? (
              <span className={cn(
                "text-[14px] font-bold leading-none",
                isSquads ? "text-primary/70" : "text-blue-600 dark:text-blue-400"
              )}>
                {multisig.label.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <Shield className={cn("h-4 w-4", isSquads ? "text-primary/70" : "text-blue-600 dark:text-blue-400")} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h1 className={cn(
                "text-[17px] font-bold tracking-[-0.02em] leading-tight",
                multisig.label ? "text-foreground" : "text-muted-foreground/50 italic"
              )}>
                {multisig.label ?? "Unnamed Vault"}
              </h1>
              <div className="flex shrink-0 items-center gap-1.5">
                {needsSigningCount !== null && needsSigningCount > 0 && (
                  <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-2 py-0.5 text-[10px] font-medium">
                    {needsSigningCount} to sign
                  </span>
                )}
                {executableCount !== null && executableCount > 0 && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                    {executableCount} ready
                  </span>
                )}
                {pendingCount !== null && pendingCount > 0 && !needsSigningCount && !executableCount && (
                  <span className="bg-muted text-muted-foreground/60 rounded-full px-2 py-0.5 text-[10px] font-medium">
                    {pendingCount} pending
                  </span>
                )}
                {CloseButton}
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className="border-border bg-muted text-muted-foreground/70 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                {multisig.chainName}
              </span>
              <span className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                isSquads
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-blue-300/50 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-400"
              )}>
                {isSquads ? "Squads" : "Safe"}
              </span>
              {multisig.tags.map((tag) => (
                <span
                  key={tag}
                  className="border-border bg-muted text-muted-foreground/70 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2.5 pl-12 space-y-0.5">
          <AddressRow
            address={multisig.address}
            label={isSquads && multisig.vaultAddress && multisig.vaultAddress !== multisig.address ? "multisig" : undefined}
            labelClassName="text-muted-foreground/40"
            explorerUrl={explorerUrl}
          />
          {isSquads && multisig.vaultAddress && multisig.vaultAddress !== multisig.address && (
            <AddressRow
              address={multisig.vaultAddress}
              label="treasury"
              labelClassName="text-primary/50"
              explorerUrl={explorerUrl}
            />
          )}
        </div>
      </div>

      {/* Body: Transactions (main) + Signers (sidebar) */}
      <div className="pt-4 flex flex-col gap-5 xl:grid xl:grid-cols-[1fr_220px] xl:items-start xl:gap-6">

        {/* Transactions — shown first */}
        <div className="order-1">
          {!loading && vaultItems.length === 0 ? (
            <div className="border-border bg-card overflow-hidden rounded-xl border">
              <div className="flex items-center gap-2.5 px-3 py-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-200/60 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600/60 dark:text-emerald-500/60" />
                </div>
                <p className="text-muted-foreground/50 text-[12px]">No proposals yet.</p>
              </div>
            </div>
          ) : (
            <OperationsQueue
              items={vaultItems}
              loading={loading}
              showFilters={false}
              compact
              hideChain
            />
          )}
        </div>

        {/* Signers — sidebar on desktop, below transactions on mobile */}
        {multisig.members.length > 0 && (
          <div className="order-2">
            <div className="border-border bg-card overflow-hidden rounded-xl border">
              <div className="border-b border-border/50 flex items-center gap-2 px-3 py-2">
                <Users className="text-muted-foreground/40 h-3.5 w-3.5" />
                <span className="text-muted-foreground/50 text-[11px] font-medium">
                  Signers
                </span>
                <span className={cn(
                  "rounded px-1.5 py-px font-mono text-[10px] font-semibold",
                  isSquads
                    ? "bg-primary/10 text-primary"
                    : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                )}>
                  {multisig.threshold}/{multisig.members.length}
                </span>
              </div>
              <TooltipProvider delayDuration={0}>
                <div className="divide-border/60 divide-y px-2 py-1">
                  {multisig.members.map((member) => (
                    <MemberRow
                      key={member.address}
                      member={member}
                      isViewer={viewerAddress === member.address}
                    />
                  ))}
                </div>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
