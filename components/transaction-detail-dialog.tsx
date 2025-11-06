"use client";

import { PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";
import bs58 from "bs58";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { SquadService } from "@/lib/squad";
import {
  type ConfigAction,
  formatConfigAction,
} from "@/lib/utils/transaction-formatter";
import { useChainStore } from "@/stores/chain-store";
import { useWalletStore } from "@/stores/wallet-store";
import type { ProposalAccount } from "@/types/multisig";

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: ProposalAccount | null;
}

interface VaultTransactionData {
  message: {
    accountKeys: string[];
    instructions: {
      programIdIndex: number;
      accountKeyIndexes: number[];
      data: string;
    }[];
  };
}

interface ConfigTransactionData {
  actions: unknown[];
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  proposal,
}: TransactionDetailDialogProps) {
  const { publicKey } = useWalletStore();
  const { chains } = useChainStore();
  const [transactionPda, setTransactionPda] = useState<string | null>(null);
  const [txData, setTxData] = useState<VaultTransactionData | null>(null);
  const [configData, setConfigData] = useState<ConfigTransactionData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multisigLabel, setMultisigLabel] = useState<string | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);

  useEffect(() => {
    async function loadTransactionData() {
      if (!proposal) return;

      // Find the chain for this proposal's multisig
      const { multisigs } = await import("@/stores/multisig-store").then((m) =>
        m.useMultisigStore.getState()
      );
      const multisigAccount = multisigs.find(
        (m) => m.publicKey.toString() === proposal.multisig.toString()
      );

      if (!multisigAccount) {
        console.error("Multisig not found for proposal");
        return;
      }

      const chain = chains.find((c) => c.id === multisigAccount.chainId);
      if (!chain) {
        console.error("Chain configuration not found");
        return;
      }

      // Set multisig label and chain name
      setMultisigLabel(multisigAccount.label || null);
      setChainName(chain.name);

      const programId = new PublicKey(chain.squadsV4ProgramId);

      const [txPda] = multisigSdk.getTransactionPda({
        multisigPda: proposal.multisig,
        index: proposal.transactionIndex,
        programId,
      });

      setTransactionPda(txPda.toString());

      // Use stored vault PDA or calculate if not available (default vault index is 0)
      if (multisigAccount.vaultPda) {
        setVaultAddress(multisigAccount.vaultPda.toString());
      } else {
        const [vaultPda] = multisigSdk.getVaultPda({
          multisigPda: proposal.multisig,
          index: 0,
          programId,
        });
        setVaultAddress(vaultPda.toString());
      }

      // Try to load transaction data
      setLoading(true);
      setError(null);
      setTxData(null);
      setConfigData(null);

      try {
        const squadService = new SquadService(
          chain.rpcUrl,
          chain.squadsV4ProgramId
        );

        // Determine transaction type first
        const txType = await squadService.getTransactionType(
          proposal.multisig,
          proposal.transactionIndex
        );

        if (txType === "config") {
          const configTx = await squadService.getConfigTransaction(
            proposal.multisig,
            proposal.transactionIndex
          );

          setConfigData({
            actions: configTx.actions,
          });
          return;
        }

        // Load VaultTransaction
        const transactionAccount = await squadService.getVaultTransaction(
          proposal.multisig,
          proposal.transactionIndex
        );

        const txData: VaultTransactionData = {
          message: {
            accountKeys: transactionAccount.message.accountKeys.map((key) =>
              key.toString()
            ),
            instructions: transactionAccount.message.instructions.map((ix) => {
              const accountIndexes = Array.isArray(ix.accountIndexes)
                ? ix.accountIndexes
                : Array.from(ix.accountIndexes);

              return {
                programIdIndex: ix.programIdIndex,
                accountKeyIndexes: accountIndexes,
                data: bs58.encode(ix.data),
              };
            }),
          },
        };

        setTxData(txData);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Transaction data not available. The transaction may not have been created yet.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (open) {
      loadTransactionData();
    }
  }, [proposal, open, chains]);

  if (!proposal) return null;

  const isCurrentUser = (address: string) => {
    return publicKey && address === publicKey.toString();
  };

  const handleCopyRawData = () => {
    const rawData = JSON.stringify(
      {
        multisig: proposal.multisig.toString(),
        transactionIndex: proposal.transactionIndex.toString(),
        creator: proposal.creator?.toString() || "Unknown",
        status: proposal.status,
        approvals: proposal.approvals.map((a) => a.toString()),
        rejections: proposal.rejections.map((r) => r.toString()),
        executed: proposal.executed,
        cancelled: proposal.cancelled,
      },
      null,
      2
    );

    navigator.clipboard.writeText(rawData);
    toast.success("Raw data copied to clipboard");
  };

  const handleCopyTxData = () => {
    const dataToCopy = txData || configData;
    if (!dataToCopy) return;
    navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
    toast.success("Transaction data copied to clipboard");
  };

  const handleOpenExplorer = async () => {
    if (!proposal) return;

    const { multisigs } = await import("@/stores/multisig-store").then((m) =>
      m.useMultisigStore.getState()
    );
    const multisigAccount = multisigs.find(
      (m) => m.publicKey.toString() === proposal.multisig.toString()
    );

    if (!multisigAccount) {
      toast.error("Multisig not found");
      return;
    }

    const chain = chains.find((c) => c.id === multisigAccount.chainId);
    if (!chain?.explorerUrl) {
      toast.error("Explorer URL not configured for this chain");
      return;
    }

    const url = `${chain.explorerUrl}/address/${proposal.multisig.toString()}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-[600px]">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            Transaction #{proposal.transactionIndex.toString()}
            <Badge>{proposal.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            Transaction details and raw data
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Multisig</h3>
              {multisigLabel && (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{multisigLabel}</p>
                  {chainName && (
                    <Badge variant="secondary" className="text-xs">
                      {chainName}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 rounded px-3 py-2 text-xs">
                  {proposal.multisig.toString()}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(proposal.multisig.toString());
                    toast.success("Multisig address copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {proposal.creator && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Creator</h3>
                <div className="flex items-center gap-2">
                  {isCurrentUser(proposal.creator.toString()) && (
                    <Badge variant="secondary" className="text-xs">
                      👤 You
                    </Badge>
                  )}
                  <AddressWithLabel
                    address={proposal.creator.toString()}
                    showFull
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Approvals</p>
                  <p className="font-semibold">{proposal.approvals.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rejections</p>
                  <p className="font-semibold">{proposal.rejections.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Executed</p>
                  <p className="font-semibold">
                    {proposal.executed ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cancelled</p>
                  <p className="font-semibold">
                    {proposal.cancelled ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>

            {proposal.approvals.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Approvers</h3>
                <div className="space-y-1">
                  {proposal.approvals.map((approver, index) => {
                    const isYou = isCurrentUser(approver.toString());
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 rounded px-3 py-2 ${isYou ? "bg-primary/10" : "bg-muted"}`}
                      >
                        {isYou && (
                          <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full">
                            <span className="text-primary text-xs font-bold">
                              ✓
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <AddressWithLabel
                            address={approver.toString()}
                            showFull
                          />
                        </div>
                        {isYou && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {proposal.rejections.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Rejectors</h3>
                <div className="space-y-1">
                  {proposal.rejections.map((rejector, index) => {
                    const isYou = isCurrentUser(rejector.toString());
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 rounded px-3 py-2 ${isYou ? "bg-primary/10" : "bg-muted"}`}
                      >
                        {isYou && (
                          <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full">
                            <span className="text-primary text-xs font-bold">
                              ✓
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <AddressWithLabel
                            address={rejector.toString()}
                            showFull
                          />
                        </div>
                        {isYou && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {transactionPda && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Transaction PDA</h3>
                <div className="flex items-center gap-2">
                  <code className="bg-muted flex-1 rounded px-3 py-2 text-xs">
                    {transactionPda}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(transactionPda);
                      toast.success("Transaction PDA copied");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {configData ? "Config Transaction Data" : "Transaction Data"}
                </h3>
                {(txData || configData) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyTxData}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              )}

              {!loading && error && (
                <div className="bg-muted text-muted-foreground rounded px-3 py-4 text-sm">
                  <p className="text-xs">{error}</p>
                </div>
              )}

              {!loading && configData && (
                <div className="space-y-3">
                  <div className="bg-muted rounded px-3 py-4 text-sm">
                    <p className="text-muted-foreground mb-3 text-xs">
                      This transaction modifies the multisig configuration.
                    </p>
                    <div>
                      <p className="text-muted-foreground mb-2 text-xs font-medium">
                        Actions ({configData.actions.length})
                      </p>
                      <div className="max-h-96 space-y-3 overflow-y-auto">
                        {configData.actions.map((action, index) => {
                          const formatted = formatConfigAction(
                            action as ConfigAction
                          );
                          return (
                            <div
                              key={index}
                              className="bg-background rounded-lg border p-4"
                            >
                              <div className="mb-3 flex items-center gap-2">
                                <Badge variant="secondary">
                                  Action {index + 1}
                                </Badge>
                                <span className="text-sm font-semibold">
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
                                      <p className="text-muted-foreground text-xs font-medium">
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
                                            <code className="bg-muted flex-1 rounded px-3 py-2 text-xs break-all">
                                              {field.value}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 shrink-0"
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
                                          <p className="text-sm font-medium">
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

              {!loading && txData && (
                <div className="space-y-3">
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      Instructions ({txData.message.instructions.length})
                    </p>
                    <div className="space-y-3">
                      {txData.message.instructions.map((ix, index) => {
                        const programAddress =
                          txData.message.accountKeys[ix.programIdIndex];
                        return (
                          <div key={index} className="bg-muted rounded p-3">
                            <div className="mb-3 space-y-2">
                              <span className="text-xs font-semibold">
                                Instruction {index + 1}
                              </span>
                              <div>
                                <span className="text-muted-foreground mb-1 block text-xs">
                                  Program: {ix.programIdIndex}
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
                                <span className="text-muted-foreground mb-2 block">
                                  Accounts ({ix.accountKeyIndexes.length})
                                </span>
                                {ix.accountKeyIndexes.length > 0 && (
                                  <div className="space-y-1.5">
                                    {ix.accountKeyIndexes.map(
                                      (accIdx: number, i: number) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-2"
                                        >
                                          <span className="text-muted-foreground w-6 shrink-0 font-mono text-xs">
                                            {accIdx}:
                                          </span>
                                          <AddressWithLabel
                                            address={
                                              txData.message.accountKeys[accIdx]
                                            }
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
                                <span className="text-muted-foreground">
                                  Data (base58):{" "}
                                </span>
                                <code className="bg-background mt-1 block rounded px-2 py-1 text-xs break-all">
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
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={handleCopyRawData}
              className="flex-1"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Proposal Data
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenExplorer}
              className="flex-1"
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
