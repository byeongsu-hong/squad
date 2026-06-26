"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  loadSafeMultisig,
  matchesSafeChainAlias,
  parseSafeReference,
} from "@/lib/safe";
import { chainIdSchema, labelSchema } from "@/lib/validation";
import { loadSquadsMultisigAccount } from "@/lib/workspace/squads-adapter";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import {
  getOperationalSquadsChains,
  normalizeChainConfig,
} from "@/types/chain";

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
        const safeMultisig = await loadSafeMultisig(
          chain,
          data.multisigAddress,
          data.label,
          tags,
          { allowDegraded: true }
        );
        addMultisig(safeMultisig);
      } else {
        addMultisig(
          await loadSquadsMultisigAccount(
            chain,
            data.multisigAddress,
            data.label,
            tags
          )
        );
      }

      toast.success("Vault imported");
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
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={`import-dialog-${open}`} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Vault</DialogTitle>
          <DialogDescription className="sr-only">
            Import an existing multisig vault by chain and address.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="chainId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground/50 text-[11px] font-medium">
                    Chain
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
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multisigAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground/50 text-[11px] font-medium">
                    Vault Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter vault address or Safe URL"
                      disabled={loading}
                      {...field}
                      onChange={(event) =>
                        handleAddressInputChange(event.target.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Also accepts an{" "}
                    <code className="font-mono text-[11px]">eth:0x…</code>{" "}
                    prefix or a full Safe app URL.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground/50 text-[11px] font-medium">
                    Label
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="My Vault" {...field} />
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
                  <FormLabel className="text-muted-foreground/50 text-[11px] font-medium">
                    Tags{" "}
                    <span className="text-muted-foreground/50 font-normal">
                      · optional
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="treasury, dao, mainnet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
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
