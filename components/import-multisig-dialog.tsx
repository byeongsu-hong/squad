"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RPC_ERROR_PATTERNS, getErrorMessage } from "@/lib/error-handler";
import { matchesSafeChainAlias, parseSafeReference } from "@/lib/safe";
import { SquadService } from "@/lib/squad";
import { chainIdSchema, labelSchema } from "@/lib/validation";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import {
  getOperationalSquadsChains,
  getSquadsProgramId,
  normalizeChainConfig,
} from "@/types/chain";
import type { SquadMember } from "@/types/squad";

interface ImportMultisigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const importMultisigFormSchema = z.object({
  chainId: chainIdSchema,
  multisigAddress: z.string().min(1, "Address or Safe URL is required"),
  label: labelSchema,
  tags: z.string().optional(),
});

type ImportFormValues = z.infer<typeof importMultisigFormSchema>;

export function ImportMultisigDialog({
  open,
  onOpenChange,
}: ImportMultisigDialogProps) {
  const [loading, setLoading] = useState(false);

  const { getSelectedChain, chains } = useChainStore();
  const { addMultisig } = useMultisigStore();
  const operationalChains = getOperationalSquadsChains(chains);
  const importableChains = chains.filter((chain) => {
    const normalizedChain = normalizeChainConfig(chain);
    return (
      normalizedChain.multisigProvider === "safe" ||
      operationalChains.some((item) => item.id === normalizedChain.id)
    );
  });

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importMultisigFormSchema),
    defaultValues: {
      chainId: "",
      multisigAddress: "",
      label: "",
    },
  });
  const selectedChainId = form.watch("chainId");

  const handleAddressInputChange = (value: string) => {
    form.setValue("multisigAddress", value, {
      shouldDirty: true,
      shouldValidate: true,
    });

    const safeReference = parseSafeReference(value);
    if (!safeReference) {
      return;
    }

    const matchedChain = importableChains.find((chain) =>
      matchesSafeChainAlias(chain.id, chain.name, safeReference.chainAlias)
    );

    if (matchedChain && matchedChain.id !== selectedChainId) {
      form.setValue("chainId", matchedChain.id, { shouldDirty: true });
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    const chain = importableChains.find((c) => c.id === data.chainId);
    if (!chain) {
      toast.error("Selected chain not found");
      return;
    }

    const normalizedChain = normalizeChainConfig(chain);
    const tags = data.tags
      ? data.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : undefined;

    setLoading(true);
    try {
      if (normalizedChain.multisigProvider === "safe") {
        const response = await fetch("/api/safe/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chain: normalizedChain,
            addressInput: data.multisigAddress,
            label: data.label,
            tags,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          multisig?: Omit<
            Parameters<typeof addMultisig>[0],
            "transactionIndex"
          > & {
            transactionIndex: string;
          };
        };

        if (!response.ok || !payload.multisig) {
          throw new Error(payload.error ?? "Failed to import Safe multisig");
        }

        const safeMultisig = {
          ...payload.multisig,
          transactionIndex: BigInt(payload.multisig.transactionIndex),
        };
        addMultisig(safeMultisig);
      } else {
        const multisigPubkey = new PublicKey(data.multisigAddress);
        const programIdString = getSquadsProgramId(chain);
        const squadService = new SquadService(chain.rpcUrl, programIdString);

        const multisigAccount = await squadService.getMultisig(multisigPubkey);

        const programId = new PublicKey(programIdString);
        const [vaultPda] = multisigSdk.getVaultPda({
          multisigPda: multisigPubkey,
          index: 0,
          programId,
        });

        addMultisig({
          provider: "squads",
          publicKey: multisigPubkey,
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
          tags,
          vaultPda,
        });
      }

      toast.success("Multisig imported successfully!");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to import multisig:", error);
      const { message, duration } = getErrorMessage(error, RPC_ERROR_PATTERNS);
      toast.error(message, { duration });
    } finally {
      setLoading(false);
    }
  });

  // Set default chain when dialog opens
  useEffect(() => {
    if (open && !form.getValues("chainId") && importableChains.length > 0) {
      const currentChain = getSelectedChain();
      const nextChainId = importableChains.some(
        (chain) => chain.id === currentChain?.id
      )
        ? currentChain?.id
        : importableChains[0]?.id;

      if (nextChainId) {
        form.setValue("chainId", nextChainId);
      }
    }
  }, [open, importableChains, form, getSelectedChain]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={`import-dialog-${open}`} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Multisig</DialogTitle>
          <DialogDescription>
            Import an existing multisig by entering its address
          </DialogDescription>
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
                      {importableChains.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <FormDescription>
                    Safe-ready EVM chains and active SVM / Squads chains are
                    available for import.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multisigAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Multisig Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter multisig address or Safe URL"
                      disabled={loading}
                      {...field}
                      onChange={(event) =>
                        handleAddressInputChange(event.target.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Paste a Squads public key, a Safe address, or a full Safe
                    URL like `app.safe.global/home?safe=eth:0x...`
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Label <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="My Imported Multisig" {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    A friendly name for this multisig
                  </FormDescription>
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
                    <Input placeholder="treasury, dao, mainnet" {...field} />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Comma-separated tags to organize your multisigs
                  </FormDescription>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
