"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import {
  chainNameSchema,
  programIdSchema,
  rpcUrlSchema,
} from "@/lib/validation";
import { useChainStore } from "@/stores/chain-store";
import type { ChainConfig } from "@/types/chain";

function stripProtocol(url: string) {
  return url.replace(/^https?:\/\//, "");
}


const chainFormSchema = z
  .object({
    name: chainNameSchema,
    vmFamily: z.enum(["svm", "evm"]),
    multisigProvider: z.enum(["squads", "safe"]),
    rpcUrl: rpcUrlSchema,
    squadsV4ProgramId: z.string(),
    explorerUrl: rpcUrlSchema.optional().or(z.literal("")),
  })
  .superRefine((data, context) => {
    if (data.multisigProvider === "squads") {
      const result = programIdSchema.safeParse(data.squadsV4ProgramId);
      if (!result.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["squadsV4ProgramId"],
          message: "Valid Squads program ID is required",
        });
      }
    }
  });

type ChainFormValues = z.infer<typeof chainFormSchema>;

export function ChainManagementController() {
  const { chains, addChain, updateChain, deleteChain, resetToDefaults } =
    useChainStore();
  const [editingChain, setEditingChain] = useState<ChainConfig | null>(null);
  const [deletingChainId, setDeletingChainId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const form = useForm<ChainFormValues>({
    resolver: zodResolver(chainFormSchema),
    defaultValues: {
      name: "",
      vmFamily: "svm",
      multisigProvider: "squads",
      rpcUrl: "",
      squadsV4ProgramId: "",
      explorerUrl: "",
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (editingChain) {
      updateChain(editingChain.id, {
        name: data.name,
        vmFamily: data.vmFamily,
        multisigProvider: data.multisigProvider,
        rpcUrl: data.rpcUrl,
        squadsV4ProgramId:
          data.multisigProvider === "squads"
            ? data.squadsV4ProgramId
            : undefined,
        explorerUrl: data.explorerUrl || undefined,
      });
      toast.success("Chain updated");
    } else {
      const newChain: ChainConfig = {
        id: `custom-${crypto.randomUUID()}`,
        name: data.name,
        vmFamily: data.vmFamily,
        multisigProvider: data.multisigProvider,
        rpcUrl: data.rpcUrl,
        squadsV4ProgramId:
          data.multisigProvider === "squads"
            ? data.squadsV4ProgramId
            : undefined,
        explorerUrl: data.explorerUrl || undefined,
      };
      addChain(newChain);
      toast.success("Chain added");
    }

    resetForm();
  });

  const handleEdit = (chain: ChainConfig) => {
    setEditingChain(chain);
    form.reset({
      name: chain.name,
      vmFamily: chain.vmFamily ?? "svm",
      multisigProvider: chain.multisigProvider ?? "squads",
      rpcUrl: chain.rpcUrl,
      squadsV4ProgramId: chain.squadsV4ProgramId ?? "",
      explorerUrl: chain.explorerUrl || "",
    });
  };

  const handleDelete = (id: string) => {
    setDeletingChainId(id);
  };

  const handleConfirmDelete = () => {
    if (!deletingChainId) return;
    deleteChain(deletingChainId);
    setDeletingChainId(null);
    toast.success("Chain deleted");
  };

  const handleResetToDefaults = () => {
    setResetDialogOpen(true);
  };

  const handleConfirmReset = () => {
    resetToDefaults();
    resetForm();
    setResetDialogOpen(false);
    toast.success("Chains reset to defaults");
  };

  const resetForm = () => {
    setEditingChain(null);
    form.reset({
      name: "",
      vmFamily: "svm",
      multisigProvider: "squads",
      rpcUrl: "",
      squadsV4ProgramId: "",
      explorerUrl: "",
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]">
      <ChainEditor
        form={form}
        editingChain={editingChain}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />

      <ChainRegistry
        chains={chains}
        editingChainId={editingChain?.id ?? null}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onResetToDefaults={handleResetToDefaults}
      />

      <AlertDialog open={!!deletingChainId} onOpenChange={(open) => !open && setDeletingChainId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chain?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the chain configuration from your workspace. No on-chain data is affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              All custom chains will be removed and default chains will be restored. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ChainEditorProps {
  form: UseFormReturn<ChainFormValues>;
  editingChain: ChainConfig | null;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
}

function ChainEditor({
  form,
  editingChain,
  onSubmit,
  onCancel,
}: ChainEditorProps) {
  const multisigProvider = form.watch("multisigProvider");

  return (
    <div className="border-border bg-card space-y-4 self-start rounded-xl border p-4">
      <p className="text-muted-foreground/50 text-[11px] font-medium">
        {editingChain ? "Edit Chain" : "New Chain"}
      </p>
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-medium text-muted-foreground/50">
                  Chain Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Eclipse Mainnet" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="vmFamily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-medium text-muted-foreground/50">VM Family</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "svm"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a VM family" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="svm">SVM</SelectItem>
                      <SelectItem value="evm">EVM</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multisigProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-medium text-muted-foreground/50">Multisig Provider</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "squads"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="squads">Squads</SelectItem>
                      <SelectItem value="safe">Safe</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="rpcUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-medium text-muted-foreground/50">
                  RPC URL <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {multisigProvider === "squads" ? (
            <FormField
              control={form.control}
              name="squadsV4ProgramId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-medium text-muted-foreground/50">
                    Squads Program ID{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="border-border/50 bg-muted/50 text-muted-foreground/60 rounded-xl border px-3 py-2.5 text-xs">
              Safe adapter addresses are configured in the Adapters tab.
            </div>
          )}

          <FormField
            control={form.control}
            name="explorerUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-medium text-muted-foreground/50">Explorer URL (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://explorer.solana.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            {editingChain && (
              <Button type="button" variant="outline" onClick={onCancel} className="shrink-0">
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 flex-1"
            >
              {editingChain ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingChain ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface ChainRegistryProps {
  chains: ChainConfig[];
  editingChainId: string | null;
  onEdit: (chain: ChainConfig) => void;
  onDelete: (id: string) => void;
  onResetToDefaults: () => void;
}

function ChainRegistry({
  chains,
  editingChainId,
  onEdit,
  onDelete,
  onResetToDefaults,
}: ChainRegistryProps) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="border-border/50 flex items-center justify-between border-b px-4 py-3">
        <p className="text-muted-foreground/50 text-[11px] font-medium">Configured Chains</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetToDefaults}
          className="text-muted-foreground/50 hover:text-foreground h-7 gap-1.5 px-2 text-[11px]"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to Defaults
        </Button>
      </div>
      <div className="divide-border/30 divide-y">
        {chains.map((chain) => {
          const isEditing = chain.id === editingChainId;
          return (
            <div
              key={chain.id}
              role="button"
              tabIndex={0}
              onClick={() => onEdit(chain)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onEdit(chain);
                }
              }}
              className={cn(
                "group grid cursor-pointer gap-3 px-4 py-3 transition-colors focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none xl:grid-cols-[minmax(12rem,0.58fr)_minmax(0,1.22fr)_auto] xl:items-center",
                isEditing
                  ? "bg-primary/5 [box-shadow:inset_2px_0_0_rgba(217,119,6,0.5)]"
                  : "hover:bg-muted/50"
              )}
            >
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {chain.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={cn(
                    "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                    (chain.vmFamily ?? "svm") === "svm"
                      ? "bg-primary/60"
                      : "bg-blue-500/60 dark:bg-blue-400/60"
                  )} />
                  <span className="text-muted-foreground/50 text-[10px]">
                    {chain.multisigProvider === "safe" ? "Safe" : "Squads"}
                    {chain.isDefault ? " · default" : chain.id.startsWith("custom-") ? " · custom" : ""}
                  </span>
                </div>
              </div>
              <div className="text-muted-foreground/70 min-w-0 space-y-0.5 text-xs">
                <p className="truncate font-mono">{stripProtocol(chain.rpcUrl)}</p>
                {chain.explorerUrl ? (
                  <p className="truncate font-mono text-muted-foreground/60">
                    {stripProtocol(chain.explorerUrl)}
                  </p>
                ) : null}
              </div>
              <div className="flex w-9 justify-self-start xl:justify-self-end">
                {chain.id !== "solana-mainnet" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(chain.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="h-9 w-9" aria-hidden="true" />
                )}
              </div>
            </div>
          );
        })}
        {chains.length === 0 ? (
          <div className="text-muted-foreground/60 py-8 text-center text-sm">
            No chains configured.
          </div>
        ) : null}
      </div>
    </div>
  );
}
