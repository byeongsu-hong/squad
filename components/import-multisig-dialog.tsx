"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey } from "@solana/web3.js";
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
import { SquadService } from "@/lib/squad";
import { chainIdSchema, labelSchema, publicKeySchema } from "@/lib/validation";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import type { SquadMember } from "@/types/squad";

interface ImportMultisigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const importMultisigFormSchema = z.object({
  chainId: chainIdSchema,
  multisigAddress: publicKeySchema,
  label: labelSchema.optional(),
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

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importMultisigFormSchema),
    defaultValues: {
      chainId: "",
      multisigAddress: "",
      label: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const chain = chains.find((c) => c.id === data.chainId);
    if (!chain) {
      toast.error("Selected chain not found");
      return;
    }

    const multisigPubkey = new PublicKey(data.multisigAddress);

    setLoading(true);
    try {
      const squadService = new SquadService(
        chain.rpcUrl,
        chain.squadsV4ProgramId
      );

      const multisigAccount = await squadService.getMultisig(multisigPubkey);

      addMultisig({
        publicKey: multisigPubkey,
        threshold: multisigAccount.threshold,
        members: multisigAccount.members.map((m: SquadMember) => ({
          key: m.key,
          permissions: { mask: m.permissions.mask },
        })),
        transactionIndex: BigInt(multisigAccount.transactionIndex.toString()),
        msChangeIndex: 0,
        programId: new PublicKey(chain.squadsV4ProgramId),
        chainId: chain.id,
        label: data.label,
        tags: data.tags
          ? data.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : undefined,
      });

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
    if (open && !form.getValues("chainId") && chains.length > 0) {
      const currentChain = getSelectedChain();
      form.setValue("chainId", currentChain?.id || chains[0].id);
    }
  }, [open, chains, form, getSelectedChain]);

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
                      {chains.map((chain) => (
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
                      placeholder="Enter multisig public key"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    The public key of an existing Squads V4 multisig
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label (Optional)</FormLabel>
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
