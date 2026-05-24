"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import {
  chainNameSchema,
  programIdSchema,
  rpcUrlSchema,
} from "@/lib/validation";
import { useChainStore } from "@/stores/chain-store";
import type { ChainConfig } from "@/types/chain";

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
    if (confirm("Are you sure you want to delete this chain configuration?")) {
      deleteChain(id);
      toast.success("Chain deleted");
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
      setEditingChain(null);
      form.reset({
        name: "",
        vmFamily: "svm",
        multisigProvider: "squads",
        rpcUrl: "",
        squadsV4ProgramId: "",
        explorerUrl: "",
      });
    }
  }, [embedded, form]);

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
          ? "border-border bg-card space-y-4 rounded-xl border p-4"
          : "space-y-6"
      }
    >
      {embedded && (
        <h3 className="text-sm font-semibold">
          {editingChain ? "Edit Chain" : "New Chain"}
        </h3>
      )}
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
            <div className="border-border bg-muted text-muted-foreground rounded-md border px-3 py-3 text-sm">
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
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20 flex-1"
            >
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
          ? "border-border bg-card space-y-3 rounded-xl border p-4"
          : "space-y-2"
      }
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Configured Chains</h3>
        <Button type="button" variant="outline" onClick={onResetToDefaults}>
          <RotateCcw className="mr-2 h-3 w-3" />
          Reset to Defaults
        </Button>
      </div>
      <div
        className={
          embedded
            ? "border-border space-y-0 overflow-hidden rounded-lg border"
            : "space-y-2"
        }
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
                ? "border-border hover:bg-muted focus-visible:ring-ring grid cursor-pointer gap-3 border-b px-4 py-3 transition-colors last:border-b-0 focus-visible:ring-1 focus-visible:outline-none xl:grid-cols-[minmax(12rem,0.58fr)_minmax(0,1.22fr)_auto] xl:items-center"
                : "hover:bg-muted border-border focus-visible:ring-ring flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors focus-visible:ring-1 focus-visible:outline-none"
            }
          >
            <div className="min-w-0 space-y-1">
              <p className="text-foreground text-[0.95rem] font-medium">
                {chain.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {chain.id.startsWith("custom-") ? (
                  <span className="border-primary/30 bg-primary/10 text-primary rounded-full border px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] uppercase">
                    Custom
                  </span>
                ) : chain.isDefault ? (
                  <span className="border-border bg-muted text-muted-foreground rounded-full border px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] uppercase">
                    Default
                  </span>
                ) : null}
                <span className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] uppercase",
                  (chain.vmFamily ?? "svm") === "svm"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-blue-300/50 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-950/30 dark:text-blue-400"
                )}>
                  {(chain.vmFamily ?? "svm").toUpperCase()}
                </span>
                <span className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] uppercase",
                  (chain.multisigProvider ?? "squads") === "squads"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-blue-300/50 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-950/30 dark:text-blue-400"
                )}>
                  {chain.multisigProvider ?? "squads"}
                </span>
              </div>
              {!embedded ? (
                <p className="text-muted-foreground text-xs">
                  RPC: {chain.rpcUrl}
                </p>
              ) : null}
            </div>
            <div className="text-muted-foreground min-w-0 space-y-1 text-xs">
              <p className="font-mono break-all">RPC: {chain.rpcUrl}</p>
              {chain.explorerUrl ? (
                <p className="font-mono break-all">
                  Explorer: {chain.explorerUrl}
                </p>
              ) : null}
            </div>
            <div className="flex w-[4.25rem] gap-1 justify-self-start xl:justify-self-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(chain);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {chain.id !== "solana-mainnet" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hover:text-destructive"
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
        ))}
        {chains.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No chains configured.
          </div>
        ) : null}
      </div>
    </div>
  );
}
