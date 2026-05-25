"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERMISSION_OPTIONS = [
  { value: 7, label: "Full access", description: "Propose, vote, and execute" },
  { value: 3, label: "Propose + Vote", description: "Cannot execute" },
  { value: 6, label: "Vote + Execute", description: "Cannot propose" },
  { value: 1, label: "Propose only", description: "" },
  { value: 2, label: "Vote only", description: "" },
  { value: 4, label: "Execute only", description: "" },
];
import { SquadService } from "@/lib/squad";
import { transactionSignerService } from "@/lib/transaction-signer";
import { createMultisigSchema } from "@/lib/validation";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWalletStore } from "@/stores/wallet-store";
import { getOperationalSquadsChains, getSquadsProgramId } from "@/types/chain";
import type { SquadMember } from "@/types/squad";
import { WalletType, parseLedgerError } from "@/types/wallet";

interface CreateMultisigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateMultisigFormValues {
  label?: string;
  tags?: string;
  threshold: number;
  members: Array<{
    key: string;
    permissions: {
      mask: number;
    };
  }>;
  timeLock?: number;
  chainId: string;
}

export function CreateMultisigDialog({
  open,
  onOpenChange,
}: CreateMultisigDialogProps) {
  const [loading, setLoading] = useState(false);

  const { publicKey, derivationPath, walletType } = useWalletStore();
  const { getSelectedChain, chains } = useChainStore();
  const { addMultisig } = useMultisigStore();
  const { signTransaction } = useWallet();
  const operationalChains = getOperationalSquadsChains(chains);

  const form = useForm<CreateMultisigFormValues>({
    resolver: zodResolver(createMultisigSchema),
    defaultValues: {
      chainId: "",
      threshold: 2,
      members: [{ key: "", permissions: { mask: 7 } }],
      label: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!publicKey) {
      toast.error("Connect a wallet first");
      return;
    }

    if (!data.chainId) {
      toast.error("Select a chain first");
      return;
    }

    const chain = operationalChains.find((c) => c.id === data.chainId);
    if (!chain) {
      toast.error("Selected chain not found");
      return;
    }

    setLoading(true);
    try {
      const programIdString = getSquadsProgramId(chain);
      const squadService = new SquadService(chain.rpcUrl, programIdString);

      const { multisigPda, createKey, instruction } =
        await squadService.createMultisig({
          creator: publicKey,
          threshold: data.threshold,
          members: data.members.map((m) => ({
            key: new PublicKey(m.key),
            permissions: { mask: m.permissions.mask },
          })),
          timeLock: data.timeLock,
        });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await squadService
        .getConnection()
        .getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      transaction.partialSign(createKey);

      // For browser wallets, verify signTransaction is available
      if (walletType === WalletType.BROWSER && !signTransaction) {
        throw new Error(
          "Wallet is not properly connected. Please reconnect your wallet."
        );
      }

      const signedTransaction = await transactionSignerService.signTransaction(
        transaction,
        {
          walletType,
          derivationPath,
          walletAdapter: signTransaction ? { signTransaction } : undefined,
        }
      );

      const txid = await squadService
        .getConnection()
        .sendRawTransaction(signedTransaction.serialize());

      await squadService.getConnection().confirmTransaction(txid);

      const multisigAccount = await squadService.getMultisig(multisigPda);

      // Calculate vault PDA (default vault index is 0)
      const programId = new PublicKey(programIdString);
      const [vaultPda] = multisigSdk.getVaultPda({
        multisigPda,
        index: 0,
        programId,
      });

      addMultisig({
        provider: "squads",
        publicKey: multisigPda,
        threshold: multisigAccount.threshold,
        members: multisigAccount.members.map((m: SquadMember) => ({
          key: m.key,
          permissions: { mask: m.permissions.mask },
        })),
        transactionIndex: BigInt(multisigAccount.transactionIndex.toString()),
        msChangeIndex: 0,
        programId,
        chainId: chain.id,
        label: data.label,
        tags: data.tags
          ? data.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : undefined,
        vaultPda,
      });

      toast.success("Multisig created");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to create multisig:", error);
      const errorMessage = parseLedgerError(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  });

  // Set default chain when dialog opens
  useEffect(() => {
    if (open && !form.getValues("chainId") && operationalChains.length > 0) {
      const currentChain = getSelectedChain();
      const nextChainId = operationalChains.some(
        (chain) => chain.id === currentChain?.id
      )
        ? currentChain?.id
        : operationalChains[0]?.id;

      if (nextChainId) {
        form.setValue("chainId", nextChainId);
      }
    }
  }, [open, operationalChains, form, getSelectedChain]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={`create-dialog-${open}`}
        className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]"
      >
        <DialogHeader>
          <DialogTitle>Create Multisig</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="chainId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Chain <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a chain" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {operationalChains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted border-border rounded-xl border space-y-3 px-4 py-4">
              <p className="text-muted-foreground/50 text-[11px] font-medium">Signers</p>

              <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Threshold <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={fields.length}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Members</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => append({ key: "", permissions: { mask: 7 } })}
                    className="text-muted-foreground/60 hover:text-foreground h-7 gap-1.5 px-2 text-[11px]"
                  >
                    <Plus className="h-3 w-3" />
                    Add Member
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`members.${index}.key`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Member address"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`members.${index}.permissions.mask`}
                        render={({ field }) => (
                          <FormItem className="w-44">
                            <Select
                              value={String(field.value)}
                              onValueChange={(v) => field.onChange(parseInt(v))}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PERMISSION_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)}>
                                    <span>{opt.label}</span>
                                    {opt.description && (
                                      <span className="text-muted-foreground ml-1 text-[11px]">
                                        · {opt.description}
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="My Multisig Wallet"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="treasury, dao, mainnet"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="shrink-0"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
