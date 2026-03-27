"use client";

import { Check, Copy, ExternalLink, Loader2, Minus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AddressWithLabel } from "@/components/address-with-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
import { useWorkspacePayload } from "@/lib/hooks/use-workspace-payload";
import type { WorkspaceProposalRecord } from "@/lib/hooks/use-workspace-proposal-records";
import {
  type ConfigAction,
  formatConfigAction,
} from "@/lib/utils/transaction-formatter";
import { useWalletStore } from "@/stores/wallet-store";

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: WorkspaceProposalRecord | null;
}

function getDecisionState(
  address: string,
  proposal: WorkspaceProposalRecord
): "approved" | "rejected" | "pending" | "inactive" {
  if (proposal.proposal.approvals.includes(address)) {
    return "approved";
  }
  if (proposal.proposal.rejections.includes(address)) {
    return "rejected";
  }
  if (proposal.proposal.status !== "Active") {
    return "inactive";
  }
  return "pending";
}

function getStatusBadgeClass(
  status: WorkspaceProposalRecord["proposal"]["status"]
) {
  if (status === "Executed") {
    return "border-lime-500/30 bg-lime-500/10 text-lime-200";
  }
  if (status === "Rejected" || status === "Cancelled") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-200";
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  proposal,
}: TransactionDetailDialogProps) {
  const { publicKey } = useWalletStore();
  const { chains } = useWorkspaceMultisigs();
  const [activeTab, setActiveTab] = useState<
    "overview" | "signers" | "payload"
  >("overview");
  const { loading, payload, error } = useWorkspacePayload({
    chains,
    multisig: open ? (proposal?.multisig ?? null) : null,
    proposal: open ? (proposal?.proposal ?? null) : null,
  });
  const transactionPda =
    payload && "transactionPda" in payload ? payload.transactionPda : null;
  const vaultAddress =
    payload && "vaultAddress" in payload ? payload.vaultAddress : null;
  const chainName = proposal?.multisig.chainName ?? null;
  const multisigLabel = proposal?.multisig.label ?? null;

  if (!proposal) return null;

  const isCurrentUser = (address: string) => {
    return publicKey && address === publicKey.toString();
  };

  const handleCopyRawData = () => {
    const rawData = JSON.stringify(
      {
        multisig: proposal.multisig.key,
        transactionIndex: proposal.proposal.transactionIndex.toString(),
        creator: proposal.proposal.creator || "Unknown",
        status: proposal.proposal.status,
        approvals: proposal.proposal.approvals,
        rejections: proposal.proposal.rejections,
        executed: proposal.proposal.executed,
        cancelled: proposal.proposal.cancelled,
      },
      null,
      2
    );

    navigator.clipboard.writeText(rawData);
    toast.success("Raw data copied to clipboard");
  };

  const handleCopyTxData = () => {
    if (!payload) return;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("Transaction data copied to clipboard");
  };

  const handleOpenExplorer = () => {
    if (!proposal) {
      toast.error("Multisig not found");
      return;
    }

    const chain = chains.find((c) => c.id === proposal.multisig.chainId);
    if (!chain?.explorerUrl) {
      toast.error("Explorer URL not configured for this chain");
      return;
    }

    const url = `${chain.explorerUrl}/address/${proposal.multisig.key}`;
    window.open(url, "_blank");
  };

  const signerSummary = proposal
    ? {
        threshold: proposal.multisig.threshold,
        members: proposal.multisig.members.length,
        pending: Math.max(
          proposal.multisig.members.length -
            proposal.proposal.approvals.length -
            proposal.proposal.rejections.length,
          0
        ),
      }
    : null;

  const tabButtonClass = (tab: "overview" | "signers" | "payload") =>
    activeTab === tab
      ? "border-zinc-100 bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
      : "border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setActiveTab("overview");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[860px]">
        <DialogHeader className="shrink-0 border-b border-zinc-800 px-6 py-5">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-zinc-50">
            Proposal #{proposal.proposal.transactionIndex.toString()}
            <Badge
              variant="outline"
              className={getStatusBadgeClass(proposal.proposal.status)}
            >
              {proposal.proposal.status}
            </Badge>
            {chainName ? (
              <Badge
                variant="outline"
                className="border-zinc-700 bg-zinc-950 px-2.5 py-1 text-zinc-300"
              >
                {chainName}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Review signer state, label unknown addresses, and inspect the
            underlying transaction payload.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-zinc-800 px-6 py-3">
          <Button
            variant="outline"
            className={tabButtonClass("overview")}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </Button>
          <Button
            variant="outline"
            className={tabButtonClass("signers")}
            onClick={() => setActiveTab("signers")}
          >
            Signers
          </Button>
          <Button
            variant="outline"
            className={tabButtonClass("payload")}
            onClick={() => setActiveTab("payload")}
          >
            Payload
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "overview" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                    Signers
                  </p>
                  <p className="mt-2 font-mono text-2xl text-zinc-50 tabular-nums">
                    {proposal.proposal.approvals.length}
                    {signerSummary ? (
                      <span className="text-zinc-600">
                        /{signerSummary.threshold}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                    Rejections
                  </p>
                  <p className="mt-2 font-mono text-2xl text-zinc-50 tabular-nums">
                    {proposal.proposal.rejections.length}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                    Pending
                  </p>
                  <p className="mt-2 font-mono text-2xl text-zinc-50 tabular-nums">
                    {signerSummary?.pending ?? "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                      Scope
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">
                      {multisigLabel || "Unnamed multisig"}
                    </p>
                  </div>
                  {signerSummary ? (
                    <Badge
                      variant="outline"
                      className="border-zinc-700 bg-zinc-950 px-2.5 py-1 text-zinc-300"
                    >
                      {signerSummary.threshold}/{signerSummary.members} signers
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                    Multisig address
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300">
                      {proposal.multisig.key}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                      onClick={() => {
                        navigator.clipboard.writeText(proposal.multisig.key);
                        toast.success("Multisig address copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {proposal.proposal.creator ? (
                  <div className="space-y-2">
                    <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                      Creator
                    </p>
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                      <AddressWithLabel
                        address={proposal.proposal.creator}
                        showFull
                      />
                      {isCurrentUser(proposal.proposal.creator) ? (
                        <Badge
                          variant="outline"
                          className="border-lime-500/30 bg-lime-500/10 text-lime-200"
                        >
                          You
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {transactionPda ? (
                  <div className="space-y-2">
                    <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                      Transaction PDA
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300">
                        {transactionPda}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                        onClick={() => {
                          navigator.clipboard.writeText(transactionPda);
                          toast.success("Transaction PDA copied");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                <div>
                  <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                    Signer status
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Open the signers tab to inspect every member in full detail.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                      Signed
                    </p>
                    <p className="mt-2 font-mono text-2xl text-zinc-50 tabular-nums">
                      {proposal.proposal.approvals.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                      Rejected
                    </p>
                    <p className="mt-2 font-mono text-2xl text-zinc-50 tabular-nums">
                      {proposal.proposal.rejections.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-[0.68rem] tracking-[0.16em] text-zinc-500 uppercase">
                      Awaiting
                    </p>
                    <p className="mt-2 font-mono text-2xl text-zinc-50 tabular-nums">
                      {signerSummary?.pending ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "signers" ? (
            <div className="space-y-4">
              <div>
                <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                  Signer map
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Full addresses stay visible here. Copy and labeling actions
                  live on each row.
                </p>
              </div>

              <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950/55">
                {proposal.multisig.members.map((member) => {
                  const address = member.address;
                  const decisionState = getDecisionState(address, proposal);
                  const isYou = isCurrentUser(address);

                  return (
                    <div
                      key={address}
                      className="flex items-start justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <AddressWithLabel address={address} showFull />
                          {isYou ? (
                            <Badge
                              variant="outline"
                              className="border-lime-500/30 bg-lime-500/10 text-lime-200"
                            >
                              You
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          decisionState === "approved"
                            ? "border-lime-500/30 bg-lime-500/10 text-lime-200"
                            : decisionState === "rejected"
                              ? "border-red-500/30 bg-red-500/10 text-red-200"
                              : decisionState === "inactive"
                                ? "border-zinc-700 bg-zinc-950 text-zinc-500"
                                : "border-zinc-700 bg-zinc-950 text-zinc-300"
                        }
                      >
                        {decisionState === "approved" ? (
                          <Check className="mr-1 h-3.5 w-3.5" />
                        ) : decisionState === "rejected" ? (
                          <X className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <Minus className="mr-1 h-3.5 w-3.5" />
                        )}
                        {decisionState === "approved"
                          ? "Signed"
                          : decisionState === "rejected"
                            ? "Rejected"
                            : decisionState === "inactive"
                              ? "No action"
                              : "Awaiting"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "payload" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                    Payload
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-zinc-100">
                    {payload?.type === "safe"
                      ? "Safe transaction payload"
                      : payload?.type === "config"
                        ? "Config transaction data"
                        : "Transaction data"}
                  </h3>
                </div>
                {payload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                    onClick={handleCopyTxData}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {loading && (
                <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/55 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              )}

              {!loading && error && (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/55 px-4 py-5 text-sm text-zinc-400">
                  <p className="text-xs">{error}</p>
                </div>
              )}

              {!loading && payload?.type === "safe" && (
                <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Safe Tx Hash</p>
                      <code className="mt-2 block font-mono text-xs break-all text-zinc-300">
                        {payload.safeTxHash ?? "Unavailable"}
                      </code>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Nonce</p>
                      <p className="mt-2 font-mono text-sm text-zinc-100">
                        {payload.nonce}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Target</p>
                      <div className="mt-2">
                        {payload.toAddress ? (
                          <AddressWithLabel
                            address={payload.toAddress}
                            showFull
                          />
                        ) : (
                          <p className="text-sm text-zinc-400">Unavailable</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Value / Operation</p>
                      <p className="mt-2 font-mono text-sm text-zinc-100">
                        {payload.value ?? "0"} wei
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Operation {payload.operation ?? 0}
                      </p>
                    </div>
                  </div>

                  {payload.data ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Calldata</p>
                      <code className="mt-2 block rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs break-all text-zinc-300">
                        {payload.data}
                      </code>
                    </div>
                  ) : null}

                  {payload.dataDecoded ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">Decoded Payload</p>
                      <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300">
                        {JSON.stringify(payload.dataDecoded, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}

              {!loading && payload?.type === "config" && (
                <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                  <div className="text-sm">
                    <p className="mb-3 text-xs text-zinc-500">
                      This transaction modifies the multisig configuration.
                    </p>
                    <div>
                      <p className="mb-2 text-xs font-medium text-zinc-500">
                        Actions ({payload.actions.length})
                      </p>
                      <div className="max-h-96 space-y-3 overflow-y-auto">
                        {payload.actions.map((action, index) => {
                          const formatted = formatConfigAction(
                            action as ConfigAction
                          );
                          return (
                            <div
                              key={index}
                              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                            >
                              <div className="mb-3 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-zinc-700 bg-zinc-900 text-zinc-300"
                                >
                                  Action {index + 1}
                                </Badge>
                                <span className="text-sm font-semibold text-zinc-100">
                                  {formatted.type}
                                </span>
                              </div>
                              <div className="space-y-3">
                                {formatted.fields.map((field, fieldIndex) => {
                                  // Check if field value is an address (string matching Solana address pattern)
                                  const isAddress =
                                    typeof field.value === "string" &&
                                    field.value.length >= 32 &&
                                    field.value.length <= 44 &&
                                    field.label
                                      .toLowerCase()
                                      .includes("address");

                                  return (
                                    <div key={fieldIndex} className="space-y-1">
                                      <p className="text-xs font-medium text-zinc-500">
                                        {field.label}
                                      </p>
                                      {typeof field.value === "string" ? (
                                        isAddress ? (
                                          <AddressWithLabel
                                            address={field.value}
                                            showFull
                                          />
                                        ) : field.value.length > 40 ? (
                                          <div className="flex items-center gap-2">
                                            <code className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs break-all text-zinc-300">
                                              {field.value}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 shrink-0 border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                                              onClick={() => {
                                                navigator.clipboard.writeText(
                                                  field.value as string
                                                );
                                                toast.success(
                                                  `${field.label} copied`
                                                );
                                              }}
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <p className="text-sm font-medium text-zinc-100">
                                            {field.value}
                                          </p>
                                        )
                                      ) : (
                                        field.value
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!loading && payload?.type === "vault" && (
                <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-zinc-500">
                      Instructions ({payload.instructions.length})
                    </p>
                    <div className="space-y-3">
                      {payload.instructions.map((ix, index) => {
                        const programAddress = ix.programAddress;
                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                          >
                            <div className="mb-3 space-y-2">
                              <span className="text-xs font-semibold text-zinc-100">
                                Instruction {index + 1}
                              </span>
                              <div>
                                <span className="mb-1 block text-xs text-zinc-500">
                                  Program
                                </span>
                                <AddressWithLabel
                                  address={programAddress}
                                  showFull
                                  vaultAddress={vaultAddress}
                                />
                              </div>
                            </div>

                            <div className="space-y-3 text-xs">
                              <div>
                                <span className="mb-2 block text-zinc-500">
                                  Accounts ({ix.accountIndexes.length})
                                </span>
                                {ix.accountIndexes.length > 0 && (
                                  <div className="space-y-1.5">
                                    {ix.accountAddresses.map(
                                      (accountAddress, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-2"
                                        >
                                          <span className="w-6 shrink-0 font-mono text-xs text-zinc-500">
                                            {ix.accountIndexes[i]}:
                                          </span>
                                          <AddressWithLabel
                                            address={accountAddress}
                                            showFull
                                            vaultAddress={vaultAddress}
                                          />
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-zinc-500">
                                  Data (base58):{" "}
                                </span>
                                <code className="mt-1 block rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs break-all text-zinc-300">
                                  {ix.data}
                                </code>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-zinc-800 px-6 py-4">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleCopyRawData}
              className="flex-1 border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Proposal Data
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenExplorer}
              className="flex-1 border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Explorer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
