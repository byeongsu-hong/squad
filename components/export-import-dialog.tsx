"use client";

import { AlertTriangle, Check, Copy, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  type ExportData,
  exportAll,
  importFromYaml,
} from "@/lib/export-import";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import { SquadService } from "@/lib/squad";
import { useAddressLabelStore } from "@/stores/address-label-store";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  type ChainConfig,
  getSquadsProgramId,
  isOperationalSquadsChain,
  normalizeChainConfig,
} from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";

interface ExportImportControllerProps {
  embedded?: boolean;
  onClose?: () => void;
}

interface ImportProgressState {
  current: number;
  total: number;
  label: string;
}

export function ExportImportController({
  embedded = false,
  onClose,
}: ExportImportControllerProps) {
  const [mode, setMode] = useState<"export" | "import">("export");
  const [exportContent, setExportContent] = useState<string>("");
  const [importContent, setImportContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [importProgress, setImportProgress] =
    useState<ImportProgressState | null>(null);

  const { chains, addChain, resetToDefaults: resetChains } = useChainStore();
  const {
    multisigs,
    addMultisig,
    resetAll: resetMultisigs,
  } = useMultisigStore();
  const { labels, upsertLabels } = useAddressLabels();
  const resetLabels = useAddressLabelStore((state) => state.resetAll);
  const resetProviderSettings = useProviderAdapterStore(
    (state) => state.resetSettings
  );
  const resetWorkspace = useWorkspaceStore((state) => state.resetAll);
  const customChainCount = chains.filter((chain) =>
    chain.id.startsWith("custom-")
  ).length;
  const multisigCount = multisigs.length;
  const labelCount = labels.length;

  const generateExport = () => {
    try {
      const currentChains = useChainStore.getState().chains;
      const currentMultisigs = useMultisigStore.getState().multisigs;
      const currentLabels = Array.from(
        useAddressLabelStore.getState().labels.values()
      ).sort((a, b) => b.updatedAt - a.updatedAt);

      const content = exportAll(currentChains, currentMultisigs, currentLabels);
      setExportContent(content);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleImport = async () => {
    try {
      if (!importContent.trim()) {
        toast.error("Paste YAML content first");
        return;
      }

      const data: ExportData = importFromYaml(importContent);
      const totalSteps =
        (data.chains?.length ?? 0) +
        (data.multisigs?.length ?? 0) +
        ((data.addressLabels?.length ?? 0) > 0 ? 1 : 0);
      let completedSteps = 0;

      const updateImportProgress = (label: string) => {
        setImportProgress({
          current: completedSteps,
          total: Math.max(totalSteps, 1),
          label,
        });
      };

      const completeImportStep = (label: string) => {
        completedSteps += 1;
        updateImportProgress(label);
      };

      setIsImporting(true);
      updateImportProgress("Parsing YAML package...");

      let importedChains = 0;
      let importedMultisigs = 0;
      let importedLabels = 0;
      const failedMultisigs: string[] = [];

      const newChains: typeof chains = [...chains];
      if (data.chains) {
        for (const chain of data.chains) {
          updateImportProgress(`Checking chain ${chain.name}...`);
          const exists = newChains.some((c) => c.id === chain.id);
          if (!exists) {
            addChain(chain);
            newChains.push(chain);
            importedChains++;
          }
          completeImportStep(`Processed chain ${chain.name}`);
        }
      }

      if (data.multisigs) {
        for (const serializedMultisig of data.multisigs) {
          try {
            updateImportProgress(
              `Importing multisig ${serializedMultisig.label ?? serializedMultisig.publicKey}...`
            );
            const exists = multisigs.some(
              (m) =>
                m.publicKey.toString() === serializedMultisig.publicKey &&
                m.chainId === serializedMultisig.chainId
            );
            if (exists) {
              completeImportStep(
                `Skipped existing multisig ${serializedMultisig.label ?? serializedMultisig.publicKey}`
              );
              continue;
            }

            const chain = newChains.find(
              (c) => c.id === serializedMultisig.chainId
            );
            if (!chain) {
              failedMultisigs.push(
                `${serializedMultisig.publicKey} (chain not found: ${serializedMultisig.chainId})`
              );
              completeImportStep(
                `Skipped multisig ${serializedMultisig.publicKey}`
              );
              continue;
            }

            if (
              serializedMultisig.provider === "safe" ||
              chain.multisigProvider === "safe"
            ) {
              const response = await fetch("/api/safe/import", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  chain: normalizeChainConfig(chain),
                  addressInput: serializedMultisig.publicKey,
                  label: serializedMultisig.label,
                  tags: serializedMultisig.tags,
                }),
              });

              const payload = (await response.json().catch(() => null)) as {
                error?: string;
                multisig?: Omit<MultisigAccount, "transactionIndex"> & {
                  transactionIndex: string;
                };
              } | null;

              if (!response.ok || !payload?.multisig) {
                failedMultisigs.push(
                  `${serializedMultisig.publicKey} (${payload?.error ?? "Safe import failed"})`
                );
                completeImportStep(
                  `Safe import failed for ${serializedMultisig.publicKey}`
                );
                continue;
              }

              addMultisig({
                ...payload.multisig,
                transactionIndex: BigInt(payload.multisig.transactionIndex),
              });
              importedMultisigs++;
              completeImportStep(
                `Imported Safe ${serializedMultisig.label ?? serializedMultisig.publicKey}`
              );
              continue;
            }

            if (!isOperationalSquadsChain(chain)) {
              failedMultisigs.push(
                `${serializedMultisig.publicKey} (chain ${chain.name} is not active for Squads imports)`
              );
              completeImportStep(
                `Skipped multisig ${serializedMultisig.publicKey}`
              );
              continue;
            }

            const programIdString = getSquadsProgramId(chain);
            const squadService = new SquadService(
              chain.rpcUrl,
              programIdString
            );

            const { PublicKey } = await import("@solana/web3.js");
            const multisigPda = new PublicKey(serializedMultisig.publicKey);
            const multisigData = await squadService.getMultisig(
              multisigPda,
              false
            );

            const multisigAccount: MultisigAccount = {
              provider: "squads",
              publicKey: multisigPda,
              threshold: multisigData.threshold,
              members: multisigData.members.map((m) => ({
                key: m.key,
                permissions: m.permissions,
              })),
              transactionIndex: BigInt(
                multisigData.transactionIndex.toString()
              ),
              msChangeIndex: 0,
              programId: new PublicKey(programIdString),
              chainId: chain.id,
              label: serializedMultisig.label,
              tags: serializedMultisig.tags,
            };

            addMultisig(multisigAccount);
            importedMultisigs++;
            completeImportStep(
              `Imported Squads multisig ${serializedMultisig.label ?? serializedMultisig.publicKey}`
            );
          } catch (error) {
            console.error(
              `Failed to import multisig ${serializedMultisig.publicKey}:`,
              error
            );
            failedMultisigs.push(
              `${serializedMultisig.publicKey} (${error instanceof Error ? error.message : "unknown error"})`
            );
            completeImportStep(
              `Failed to import ${serializedMultisig.publicKey}`
            );
          }
        }
      }

      if (data.addressLabels?.length) {
        updateImportProgress("Merging address labels...");
        const existingAddresses = new Set(labels.map((label) => label.address));
        importedLabels = data.addressLabels.filter(
          (label) => !existingAddresses.has(label.address)
        ).length;
        upsertLabels(data.addressLabels);
        completeImportStep("Merged address labels");
      }

      const messages = [];
      if (importedChains > 0) messages.push(`${importedChains} chain(s)`);
      if (importedMultisigs > 0)
        messages.push(`${importedMultisigs} vault(s)`);
      if (importedLabels > 0) messages.push(`${importedLabels} label(s)`);

      if (messages.length > 0) {
        toast.success("Import successful", {
          description: `Imported ${messages.join(" and ")}${failedMultisigs.length > 0 ? `. ${failedMultisigs.length} vault(s) failed.` : ""}`,
        });
        setImportContent("");
        if (!embedded) {
          onClose?.();
        }
      } else if (failedMultisigs.length > 0) {
        toast.error("Import failed", {
          description: `Failed to import ${failedMultisigs.length} multisig(s)`,
        });
      } else {
        toast.info("No new items to import", {
          description: "All items already exist",
        });
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Import failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleResetImportedState = () => {
    resetMultisigs();
    resetChains();
    resetLabels();
    resetProviderSettings();
    resetWorkspace();
    setImportContent("");
    setImportProgress(null);
    setIsImporting(false);
    setResetDialogOpen(false);

    toast.success("Workspace reset complete", {
      description:
        "Saved vaults, labels, custom chains, and provider settings were cleared.",
    });
  };

  const handleOpenResetDialog = () => {
    setResetDialogOpen(true);
  };

  const handleModeChange = (newMode: "export" | "import") => {
    setMode(newMode);
    setExportContent("");
    setImportContent("");
    setCopied(false);
    if (newMode === "export") {
      generateExport();
    }
  };

  useEffect(() => {
    if (mode === "export") {
      generateExport();
    }
  }, [chains, labels, mode, multisigs]);

  return (
    <>
      <div
        className={
          embedded ? "space-y-5" : "flex-1 space-y-6 overflow-y-auto py-4"
        }
      >
        <ExportImportModePicker
          embedded={embedded}
          mode={mode}
          disabled={isImporting}
          onModeChange={handleModeChange}
        />

        {mode === "export" && exportContent && (
          <ExportImportExportPanel
            embedded={embedded}
            chains={chains}
            multisigs={multisigs}
            exportContent={exportContent}
            copied={copied}
            onCopy={handleCopy}
          />
        )}

        {mode === "import" && (
          <ExportImportImportPanel
            embedded={embedded}
            importContent={importContent}
            importProgress={importProgress}
            isImporting={isImporting}
            onImportContentChange={setImportContent}
            onResetImportedState={handleOpenResetDialog}
          />
        )}
      </div>

      {!embedded ? (
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onClose?.()} className="shrink-0">
            Close
          </Button>
          {mode === "import" && (
            <Button
              type="button"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isImporting ? "Importing..." : "Import"}
            </Button>
          )}
        </div>
      ) : mode === "import" ? (
        <div className="flex justify-end pt-4">
          <Button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </div>
      ) : null}

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[30rem] gap-0 overflow-hidden border-destructive/20 bg-[linear-gradient(180deg,rgba(35,20,20,0.98),rgba(20,15,18,0.99))] p-0"
        >
          <div className="border-b border-destructive/15 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
                <AlertTriangle className="text-destructive/70 h-5 w-5" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-[1.1rem]">
                  Reset imported workspace state?
                </DialogTitle>
                <DialogDescription className="max-w-md">
                  Use this only when a YAML import left the local workspace in a
                  broken state. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="bg-muted rounded-xl p-4 grid gap-2">
              <p className="text-muted-foreground/50 text-[11px] font-medium">
                What gets cleared
              </p>
              <p className="text-foreground/80 text-sm">
                Saved vaults, custom chains, address labels, provider
                settings, and current workspace selections.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Vaults
                </p>
                <p className="text-foreground mt-1 text-lg font-medium">
                  {multisigCount}
                </p>
              </div>
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Custom chains
                </p>
                <p className="text-foreground mt-1 text-lg font-medium">
                  {customChainCount}
                </p>
              </div>
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Labels
                </p>
                <p className="text-foreground mt-1 text-lg font-medium">
                  {labelCount}
                </p>
              </div>
            </div>
          </div>

          <div className="border-border flex items-center justify-between border-t px-6 py-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetImportedState}
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ExportImportModePickerProps {
  embedded: boolean;
  mode: "export" | "import";
  disabled?: boolean;
  onModeChange: (mode: "export" | "import") => void;
}

function ExportImportModePicker({
  embedded,
  mode,
  disabled = false,
  onModeChange,
}: ExportImportModePickerProps) {
  return (
    <RadioGroup value={mode} onValueChange={onModeChange} disabled={disabled}>
      <div className={embedded ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
        <Label
          htmlFor={embedded ? "settings-export" : "export"}
          className={cn(
            "cursor-pointer font-normal text-foreground/80",
            embedded
              ? "rounded-xl flex items-start gap-3 border px-3 py-3 text-xs font-medium transition-colors"
              : "flex items-center space-x-2 text-xs font-medium",
            embedded && mode === "export"
              ? "border-primary/40 bg-primary/5"
              : embedded
                ? "border-border bg-card"
                : ""
          )}
        >
          <RadioGroupItem
            value="export"
            id={embedded ? "settings-export" : "export"}
          />
          <span className="space-y-1">
            <span className="text-foreground block text-sm">
              Export to YAML
            </span>
            {embedded ? (
              <span className="text-muted-foreground/60 block text-xs">
                Generate the complete portable workspace snapshot.
              </span>
            ) : null}
          </span>
        </Label>
        <Label
          htmlFor={embedded ? "settings-import" : "import"}
          className={cn(
            "cursor-pointer font-normal text-foreground/80",
            embedded
              ? "rounded-xl flex items-start gap-3 border px-3 py-3 text-xs font-medium transition-colors"
              : "flex items-center space-x-2 text-xs font-medium",
            embedded && mode === "import"
              ? "border-primary/40 bg-primary/5"
              : embedded
                ? "border-border bg-card"
                : ""
          )}
        >
          <RadioGroupItem
            value="import"
            id={embedded ? "settings-import" : "import"}
          />
          <span className="space-y-1">
            <span className="text-foreground block text-sm">
              Import from YAML
            </span>
            {embedded ? (
              <span className="text-muted-foreground/60 block text-xs">
                Merge chains and vaults from another environment.
              </span>
            ) : null}
          </span>
        </Label>
      </div>
    </RadioGroup>
  );
}

interface ExportImportExportPanelProps {
  embedded: boolean;
  chains: ChainConfig[];
  multisigs: MultisigAccount[];
  exportContent: string;
  copied: boolean;
  onCopy: () => void;
}

function ExportImportExportPanel({
  embedded,
  chains,
  multisigs,
  exportContent,
  copied,
  onCopy,
}: ExportImportExportPanelProps) {
  const operationalSquadsChains = chains.filter(isOperationalSquadsChain);
  const preparedSafeChains = chains.filter(
    (chain) => chain.multisigProvider === "safe"
  );

  return (
    <div
      className={
        embedded ? "grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]" : "space-y-2"
      }
    >
      <div
        className={
          embedded
            ? "border-border bg-card rounded-xl space-y-3 border p-4"
            : "flex items-center justify-between"
        }
      >
        {embedded ? (
          <>
            <div className="grid gap-2">
              <div className="bg-muted rounded-xl px-3 py-2">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Squads chains
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {operationalSquadsChains.length}
                </p>
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Vaults
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {multisigs.length}
                </p>
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Safe-ready chains
                </p>
                <p className="text-foreground mt-1 text-sm font-medium">
                  {preparedSafeChains.length}
                </p>
              </div>
              <Button
                type="button"
                onClick={onCopy}
                disabled={copied}
                className="justify-start bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy YAML
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onCopy}
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </>
        )}
      </div>
      <div
        className={
          embedded
            ? "border-border/50 bg-muted/30 rounded-xl min-h-[28rem] w-full overflow-auto border"
            : "h-[400px] w-full overflow-auto rounded-md border"
        }
      >
        <pre className="p-4 font-mono text-[11px] whitespace-pre text-muted-foreground/70">
          <code>{exportContent}</code>
        </pre>
      </div>
    </div>
  );
}

interface ExportImportImportPanelProps {
  embedded: boolean;
  importContent: string;
  importProgress: ImportProgressState | null;
  isImporting: boolean;
  onImportContentChange: (value: string) => void;
  onResetImportedState: () => void;
}

function ExportImportImportPanel({
  embedded,
  importContent,
  importProgress,
  isImporting,
  onImportContentChange,
  onResetImportedState,
}: ExportImportImportPanelProps) {
  const progressValue = importProgress
    ? (importProgress.current / importProgress.total) * 100
    : 0;

  return (
    <div className="space-y-3">
        <div className="border-border bg-card rounded-xl flex items-start justify-between gap-3 border px-3 py-3">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">Reset state</p>
            <p className="text-muted-foreground/70 text-xs leading-5">
              If a YAML import left local state broken, clear saved vaults,
              custom chains, labels, and provider settings.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            className="shrink-0"
            onClick={onResetImportedState}
          >
            Reset
          </Button>
        </div>
        {isImporting && importProgress ? (
          <div className="border-border bg-card rounded-xl space-y-2 border px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-foreground/80 text-sm">
                {importProgress.label}
              </p>
              <p className="text-muted-foreground/70 text-xs tabular-nums">
                {Math.min(importProgress.current, importProgress.total)} /{" "}
                {importProgress.total}
              </p>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        ) : null}
        <Textarea
          value={importContent}
          onChange={(e) => onImportContentChange(e.target.value)}
          disabled={isImporting}
          placeholder="Paste your YAML configuration here..."
          className={cn(
            "font-mono text-xs",
            embedded ? "min-h-[28rem] resize-y rounded-xl" : "min-h-[300px] resize-none rounded-md"
          )}
        />
    </div>
  );
}
