"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import {
  chainNameSchema,
  programIdSchema,
  rpcUrlSchema,
} from "@/lib/validation";
import { useChainStore } from "@/stores/chain-store";
import type { ChainConfig } from "@/types/chain";

interface ChainManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChainManagementControllerProps {
  embedded?: boolean;
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

export function ChainManagementDialog({
  open,
  onOpenChange,
}: ChainManagementDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
      }}
    >
      <DialogContent
        key={`chain-dialog-${open}`}
        className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]"
      >
        <DialogHeader>
          <DialogTitle>Chain Management</DialogTitle>
          <DialogDescription>
            Add or manage custom SVM chain configurations
          </DialogDescription>
        </DialogHeader>

        <ChainManagementController />
      </DialogContent>
    </Dialog>
  );
}

export function ChainManagementController({
  embedded = false,
}: ChainManagementControllerProps) {
  const { chains, addChain, updateChain, deleteChain, resetToDefaults } =
    useChainStore();
  const [editingChain, setEditingChain] = useState<ChainConfig | null>(null);

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
      toast.success("Chain updated successfully");
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
      toast.success("Chain added successfully");
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
    if (confirm("Are you sure you want to delete this chain configuration?")) {
      deleteChain(id);
      toast.success("Chain deleted successfully");
    }
  };

  const handleResetToDefaults = () => {
    if (
      confirm(
        "Are you sure you want to reset all chains to default? This will remove all custom chains."
      )
    ) {
      resetToDefaults();
      resetForm();
      toast.success("Chains reset to defaults");
    }
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

  useEffect(() => {
    if (!embedded) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded]);

  return (
    <div
      className={
        embedded
          ? "grid gap-5 xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]"
          : "space-y-6"
      }
    >
      <ChainEditor
        embedded={embedded}
        form={form}
        editingChain={editingChain}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />

      {embedded ? null : <Separator />}

      <ChainRegistry
        embedded={embedded}
        chains={chains}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onResetToDefaults={handleResetToDefaults}
      />
    </div>
  );
}

interface ChainEditorProps {
  embedded: boolean;
  form: UseFormReturn<ChainFormValues>;
  editingChain: ChainConfig | null;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
}

function ChainEditor({
  embedded,
  form,
  editingChain,
  onSubmit,
  onCancel,
}: ChainEditorProps) {
  const multisigProvider = form.watch("multisigProvider");

  return (
    <div
      className={
        embedded
          ? "space-y-4 border border-zinc-800 bg-zinc-950/55 p-4"
          : "space-y-6"
      }
    >
      {embedded ? (
        <div className="space-y-1 border-b border-zinc-800 pb-4">
          <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
            Chain Editor
          </p>
          <p className="text-sm leading-6 text-zinc-400">
            Define the RPC, program, and explorer endpoints that this workspace
            trusts for proposal loading and execution.
          </p>
        </div>
      ) : null}
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
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
                  <FormLabel>VM Family</FormLabel>
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
                  <FormDescription>
                    Determines the transaction runtime this chain belongs to.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multisigProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Multisig Provider</FormLabel>
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
                  <FormDescription>
                    Safe chains are settings-only for now and do not participate
                    in current signing flows.
                  </FormDescription>
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
                <FormLabel>
                  RPC URL <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Must use HTTPS or WSS protocol for security
                </FormDescription>
              </FormItem>
            )}
          />

          {multisigProvider === "squads" ? (
            <FormField
              control={form.control}
              name="squadsV4ProgramId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
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
            <div className="rounded-md border border-zinc-800 bg-zinc-950/55 px-3 py-3 text-sm text-zinc-400">
              Safe-specific runtime addresses live in the adapter settings
              panel. Chain creation here stores the network identity and RPC /
              explorer endpoints.
            </div>
          )}

          <FormField
            control={form.control}
            name="explorerUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Explorer URL (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://explorer.solana.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              {editingChain ? "Update Chain" : "Add Chain"}
            </Button>
            {editingChain && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

interface ChainRegistryProps {
  embedded: boolean;
  chains: ChainConfig[];
  onEdit: (chain: ChainConfig) => void;
  onDelete: (id: string) => void;
  onResetToDefaults: () => void;
}

function ChainRegistry({
  embedded,
  chains,
  onEdit,
  onDelete,
  onResetToDefaults,
}: ChainRegistryProps) {
  return (
    <div
      className={
        embedded
          ? "space-y-3 border border-zinc-800 bg-zinc-950/35 p-4"
          : "space-y-2"
      }
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Configured Chains</h3>
          {embedded ? (
            <p className="text-sm text-zinc-400">
              Review every configured endpoint before editing or deleting it.
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={onResetToDefaults}>
          <RotateCcw className="mr-2 h-3 w-3" />
          Reset to Defaults
        </Button>
      </div>
      <div
        className={embedded ? "space-y-0 border border-zinc-800" : "space-y-2"}
      >
        {chains.map((chain) => (
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
            className={
              embedded
                ? "grid cursor-pointer gap-3 border-b border-zinc-800 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-900/60 focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:outline-none xl:grid-cols-[minmax(12rem,0.58fr)_minmax(0,1.22fr)_auto] xl:items-center"
                : "hover:bg-accent/40 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:outline-none"
            }
          >
            <div className="min-w-0 space-y-1">
              <p className="text-[0.95rem] font-medium text-zinc-100">
                {chain.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {chain.id.startsWith("custom-") ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] text-amber-300 uppercase">
                    Custom
                  </span>
                ) : chain.isDefault ? (
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] text-zinc-400 uppercase">
                    Default
                  </span>
                ) : null}
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] text-zinc-400 uppercase">
                  {(chain.vmFamily ?? "svm").toUpperCase()}
                </span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] text-zinc-400 uppercase">
                  {chain.multisigProvider ?? "squads"}
                </span>
              </div>
              {!embedded ? (
                <p className="text-muted-foreground text-xs">
                  RPC: {chain.rpcUrl}
                </p>
              ) : (
                <p className="text-[0.68rem] tracking-[0.14em] text-zinc-500 uppercase">
                  {chain.id}
                </p>
              )}
            </div>
            <div className="min-w-0 space-y-1 text-xs text-zinc-400">
              <p className="font-mono break-all">RPC: {chain.rpcUrl}</p>
              {chain.explorerUrl ? (
                <p className="font-mono break-all">
                  Explorer: {chain.explorerUrl}
                </p>
              ) : null}
            </div>
            <div className="flex w-[4.25rem] gap-1 justify-self-start xl:justify-self-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(chain);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {chain.id !== "solana-mainnet" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(chain.id);
                  }}
                >
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              ) : (
                <span className="h-9 w-9" aria-hidden="true" />
              )}
            </div>
          </div>
        ))}
        {chains.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No chains configured.
          </div>
        ) : null}
      </div>
    </div>
  );
}
