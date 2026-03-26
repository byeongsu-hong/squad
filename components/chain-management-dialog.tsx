"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
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

interface ChainManagementContentProps {
  embedded?: boolean;
}

const chainFormSchema = z.object({
  name: chainNameSchema,
  rpcUrl: rpcUrlSchema,
  squadsV4ProgramId: programIdSchema,
  explorerUrl: rpcUrlSchema.optional().or(z.literal("")),
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

        <ChainManagementContent />
      </DialogContent>
    </Dialog>
  );
}

export function ChainManagementContent({
  embedded = false,
}: ChainManagementContentProps) {
  const { chains, addChain, updateChain, deleteChain, resetToDefaults } =
    useChainStore();
  const [editingChain, setEditingChain] = useState<ChainConfig | null>(null);

  const form = useForm<ChainFormValues>({
    resolver: zodResolver(chainFormSchema),
    defaultValues: {
      name: "",
      rpcUrl: "",
      squadsV4ProgramId: "",
      explorerUrl: "",
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    if (editingChain) {
      updateChain(editingChain.id, {
        name: data.name,
        rpcUrl: data.rpcUrl,
        squadsV4ProgramId: data.squadsV4ProgramId,
        explorerUrl: data.explorerUrl || undefined,
      });
      toast.success("Chain updated successfully");
    } else {
      const newChain: ChainConfig = {
        id: `custom-${crypto.randomUUID()}`,
        name: data.name,
        rpcUrl: data.rpcUrl,
        squadsV4ProgramId: data.squadsV4ProgramId,
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
      rpcUrl: chain.rpcUrl,
      squadsV4ProgramId: chain.squadsV4ProgramId,
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
              Define the RPC, program, and explorer endpoints that this
              workspace trusts for proposal loading and execution.
            </p>
          </div>
        ) : null}
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <FormField
              control={form.control}
              name="squadsV4ProgramId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Squad Program ID <span className="text-destructive">*</span>
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

            <FormField
              control={form.control}
              name="explorerUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explorer URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://explorer.solana.com"
                      {...field}
                    />
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
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>

      {embedded ? null : <Separator />}

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
          <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
            <RotateCcw className="mr-2 h-3 w-3" />
            Reset to Defaults
          </Button>
        </div>
        <div
          className={
            embedded ? "space-y-0 border border-zinc-800" : "space-y-2"
          }
        >
          {chains.map((chain) => (
            <div
              key={chain.id}
              role="button"
              tabIndex={0}
              onClick={() => handleEdit(chain)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleEdit(chain);
                }
              }}
              className={
                embedded
                  ? "grid cursor-pointer items-center gap-2 border-b border-zinc-800 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 md:grid-cols-[minmax(13rem,0.64fr)_minmax(0,1.16fr)_auto]"
                  : "flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
              }
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-[0.95rem] font-medium text-zinc-100">
                    {chain.name}
                  </p>
                  {chain.id.startsWith("custom-") ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] text-amber-300 uppercase">
                      Custom
                    </span>
                  ) : chain.isDefault ? (
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[0.62rem] tracking-[0.16em] text-zinc-400 uppercase">
                      Default
                    </span>
                  ) : null}
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
              <div className="space-y-1 text-xs text-zinc-400">
                <p className="font-mono break-all">RPC: {chain.rpcUrl}</p>
                {chain.explorerUrl ? (
                  <p className="font-mono break-all">
                    Explorer: {chain.explorerUrl}
                  </p>
                ) : null}
              </div>
              <div className="flex w-[4.25rem] gap-1 justify-self-start md:justify-self-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit(chain);
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
                      handleDelete(chain.id);
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
    </div>
  );
}
