"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
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

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface ExportImportControllerProps {
  embedded?: boolean;
  onClose?: () => void;
}

interface ImportProgressState {
  current: number;
  total: number;
  label: string;
}

export function ExportImportDialog() {
  return <DialogShell />;
}

function DialogShell() {
  const [isOpen, setIsOpen] = useState(false);
  const handleDialogChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Download className="h-4 w-4" />
          <span className="sr-only">Export / Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export / Import Settings</DialogTitle>
          <DialogDescription>
            Export your configuration to YAML or import from clipboard.
          </DialogDescription>
        </DialogHeader>
        <ExportImportController onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
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
        toast.error("Please paste YAML content");
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
        messages.push(`${importedMultisigs} multisig(s)`);
      if (importedLabels > 0) messages.push(`${importedLabels} label(s)`);

      if (messages.length > 0) {
        toast.success("Import successful", {
          description: `Imported ${messages.join(" and ")}${failedMultisigs.length > 0 ? `. ${failedMultisigs.length} multisig(s) failed.` : ""}`,
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
        "Saved multisigs, labels, custom chains, and provider settings were cleared.",
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose?.()}>
            Close
          </Button>
          {mode === "import" && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isImporting ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      ) : mode === "import" ? (
        <div className="flex justify-end pt-4">
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </div>
      ) : null}

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[30rem] gap-0 overflow-hidden border-red-500/20 bg-[linear-gradient(180deg,rgba(35,20,20,0.98),rgba(20,15,18,0.99))] p-0"
        >
          <div className="border-b border-red-500/15 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-300" />
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
            <div className="grid gap-2 border border-zinc-800 bg-zinc-950/50 p-4">
              <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                What gets cleared
              </p>
              <p className="text-sm text-zinc-300">
                Saved multisigs, custom chains, address labels, provider
                settings, and current workspace selections.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="border border-zinc-800 bg-zinc-950/50 px-3 py-3">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Multisigs
                </p>
                <p className="mt-1 text-lg font-medium text-zinc-100">
                  {multisigCount}
                </p>
              </div>
              <div className="border border-zinc-800 bg-zinc-950/50 px-3 py-3">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Custom chains
                </p>
                <p className="mt-1 text-lg font-medium text-zinc-100">
                  {customChainCount}
                </p>
              </div>
              <div className="border border-zinc-800 bg-zinc-950/50 px-3 py-3">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Labels
                </p>
                <p className="mt-1 text-lg font-medium text-zinc-100">
                  {labelCount}
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-zinc-500">
              Default chain presets remain available after reset. Right now this
              action will remove {multisigCount} multisig
              {multisigCount === 1 ? "" : "s"}, {customChainCount} custom chain
              {customChainCount === 1 ? "" : "s"}, and {labelCount} label
              {labelCount === 1 ? "" : "s"}.
            </p>
          </div>

          <DialogFooter className="border-t border-zinc-800 px-6 py-5 sm:justify-between">
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
              Reset Workspace State
            </Button>
          </DialogFooter>
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
          className={
            embedded
              ? "flex cursor-pointer items-start gap-3 border border-zinc-800 bg-zinc-950/55 px-3 py-3 font-normal"
              : "flex cursor-pointer items-center space-x-2 font-normal"
          }
        >
          <RadioGroupItem
            value="export"
            id={embedded ? "settings-export" : "export"}
          />
          <span className="space-y-1">
            <span className="block text-sm text-zinc-100">Export to YAML</span>
            {embedded ? (
              <span className="block text-xs text-zinc-400">
                Generate the complete portable workspace snapshot.
              </span>
            ) : null}
          </span>
        </Label>
        <Label
          htmlFor={embedded ? "settings-import" : "import"}
          className={
            embedded
              ? "flex cursor-pointer items-start gap-3 border border-zinc-800 bg-zinc-950/55 px-3 py-3 font-normal"
              : "flex cursor-pointer items-center space-x-2 font-normal"
          }
        >
          <RadioGroupItem
            value="import"
            id={embedded ? "settings-import" : "import"}
          />
          <span className="space-y-1">
            <span className="block text-sm text-zinc-100">
              Import from YAML
            </span>
            {embedded ? (
              <span className="block text-xs text-zinc-400">
                Merge chains and multisigs from another environment.
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
            ? "space-y-3 border border-zinc-800 bg-zinc-950/55 p-4"
            : "flex items-center justify-between"
        }
      >
        {embedded ? (
          <>
            <div className="space-y-1">
              <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                Export package
              </p>
              <p className="text-sm leading-6 text-zinc-400">
                Current output contains all saved chains and multisigs in a
                single portable YAML document.
              </p>
            </div>
            <div className="grid gap-2">
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-2">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Squads chains
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-100">
                  {operationalSquadsChains.length}
                </p>
              </div>
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-2">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Multisigs
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-100">
                  {multisigs.length}
                </p>
              </div>
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-2">
                <p className="text-[0.62rem] tracking-[0.16em] text-zinc-500 uppercase">
                  Safe-ready chains
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-100">
                  {preparedSafeChains.length}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={onCopy}
                disabled={copied}
                className="justify-start border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy YAML
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Label>YAML Configuration:</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
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
            ? "min-h-[28rem] w-full overflow-auto border border-zinc-800 bg-zinc-950/35"
            : "h-[400px] w-full overflow-auto rounded-md border"
        }
      >
        <pre className="p-4 text-xs whitespace-pre">
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
    <div
      className={
        embedded ? "grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]" : "space-y-3"
      }
    >
      {embedded ? (
        <div className="space-y-3 border border-zinc-800 bg-zinc-950/55 p-4">
          <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
            Import rules
          </p>
          <div className="space-y-2 text-sm leading-6 text-zinc-400">
            <p>Existing items are preserved.</p>
            <p>New chains import before multisigs.</p>
            <p>Duplicate multisigs are skipped.</p>
            <p>Missing-chain entries are reported as failures.</p>
            <p>Non-Squads chains import as settings only.</p>
            <p>Multisigs targeting Safe-prepared chains are skipped for now.</p>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        <Label>Paste YAML content:</Label>
        <p className="text-muted-foreground text-sm">
          Existing items will be preserved. Only new items will be imported.
        </p>
        <div className="flex items-start justify-between gap-3 border border-zinc-800 bg-zinc-950/50 px-3 py-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-100">Reset state</p>
            <p className="text-xs leading-5 text-zinc-500">
              If a YAML import left local state broken, clear saved multisigs,
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
          <div className="space-y-2 border border-zinc-800 bg-zinc-950/50 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-200">{importProgress.label}</p>
              <p className="text-xs text-zinc-500 tabular-nums">
                {Math.min(importProgress.current, importProgress.total)} /{" "}
                {importProgress.total}
              </p>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        ) : null}
        <textarea
          value={importContent}
          onChange={(e) => onImportContentChange(e.target.value)}
          disabled={isImporting}
          placeholder="Paste your YAML configuration here..."
          className={
            embedded
              ? "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[28rem] w-full resize-y overflow-auto border border-zinc-800 px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              : "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[300px] w-full resize-none overflow-auto rounded-md border px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          }
        />
      </div>
    </div>
  );
}
