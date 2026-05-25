"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileText,
  Link,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type ExportData,
  exportAll,
  importFromYaml,
} from "@/lib/export-import";
import {
  type RawYamlPreview,
  type WorkspacePackageSummary,
  buildRawYamlPreview,
  buildWorkspacePackageSummary,
  formatBytes,
} from "@/lib/export-import-package";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import { SquadService } from "@/lib/squad";
import { cn } from "@/lib/utils";
import { useAddressLabelStore } from "@/stores/address-label-store";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  getSquadsProgramId,
  isOperationalSquadsChain,
  normalizeChainConfig,
} from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import { providerAdaptersToSettings } from "@/types/provider-adapter";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";

interface ImportProgressState {
  current: number;
  total: number;
  label: string;
}

interface ImportReviewState {
  data: ExportData;
  summary: WorkspacePackageSummary;
  rawPreview: RawYamlPreview;
}

export function ExportImportController() {
  const [mode, setMode] = useState<"export" | "import">("export");
  const [exportContent, setExportContent] = useState<string>("");
  const [importContent, setImportContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [importProgress, setImportProgress] =
    useState<ImportProgressState | null>(null);
  const [importReview, setImportReview] = useState<ImportReviewState | null>(
    null
  );

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
  const updateProviderSettings = useProviderAdapterStore(
    (state) => state.updateSettings
  );
  const providerAdapterSettings = useProviderAdapterStore(
    (state) => state.settings
  );
  const resetWorkspace = useWorkspaceStore((state) => state.resetAll);
  const customChainCount = chains.filter((chain) =>
    chain.id.startsWith("custom-")
  ).length;
  const multisigCount = multisigs.length;
  const labelCount = labels.length;
  const exportPackage = useMemo(() => {
    if (!exportContent) {
      return null;
    }

    try {
      const data = importFromYaml(exportContent);
      const summary = buildWorkspacePackageSummary(data, exportContent);
      return {
        summary,
        rawPreview: buildRawYamlPreview(exportContent, {
          customAbiCount: summary.counts.customAbis,
        }),
      };
    } catch {
      return null;
    }
  }, [exportContent]);

  const generateExport = () => {
    try {
      const currentChains = useChainStore.getState().chains;
      const currentMultisigs = useMultisigStore.getState().multisigs;
      const currentLabels = Array.from(
        useAddressLabelStore.getState().labels.values()
      ).sort((a, b) => b.updatedAt - a.updatedAt);
      const currentProviderAdapterSettings =
        useProviderAdapterStore.getState().settings;

      const content = exportAll(
        currentChains,
        currentMultisigs,
        currentLabels,
        currentProviderAdapterSettings
      );
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

  const handleSaveYaml = () => {
    if (!exportContent) return;

    const blob = new Blob([exportContent], {
      type: "application/x-yaml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `squad-workspace-${new Date().toISOString().slice(0, 10)}.yaml`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const updateImportContent = (content: string) => {
    setImportContent(content);
    setImportReview(null);
  };

  const handleReviewImport = () => {
    try {
      if (!importContent.trim()) {
        toast.error("Paste YAML content first");
        return;
      }

      const data = importFromYaml(importContent);
      const summary = buildWorkspacePackageSummary(data, importContent);
      setImportReview({
        data,
        summary,
        rawPreview: buildRawYamlPreview(importContent, {
          customAbiCount: summary.counts.customAbis,
        }),
      });
    } catch (error) {
      setImportReview(null);
      toast.error("Import review failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleImport = async () => {
    try {
      if (!importReview) {
        handleReviewImport();
        return;
      }

      const data = importReview.data;
      const hasProviderAdapters = Boolean(data.providerAdapters?.evm?.safe);
      const customAbiCount =
        data.providerAdapters?.evm?.safe?.customAbis.length ?? 0;
      const totalSteps =
        (data.chains?.length ?? 0) +
        (data.multisigs?.length ?? 0) +
        ((data.addressLabels?.length ?? 0) > 0 ? 1 : 0) +
        (hasProviderAdapters ? 1 : 0);
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
      let importedProviderAdapters = false;
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

      if (hasProviderAdapters) {
        updateImportProgress("Configuring EVM Safe adapter...");
        updateProviderSettings(
          providerAdaptersToSettings(data.providerAdapters)
        );
        importedProviderAdapters = true;
        completeImportStep("Configured EVM Safe adapter");
      }

      const messages = [];
      if (importedChains > 0) messages.push(`${importedChains} chain(s)`);
      if (importedMultisigs > 0) messages.push(`${importedMultisigs} vault(s)`);
      if (importedLabels > 0) messages.push(`${importedLabels} label(s)`);
      if (importedProviderAdapters) messages.push("EVM adapter settings");
      if (importedProviderAdapters && customAbiCount > 0) {
        messages.push(`${customAbiCount} custom ABI(s)`);
      }

      if (messages.length > 0) {
        toast.success("Import successful", {
          description: `Imported ${messages.join(" and ")}${failedMultisigs.length > 0 ? `. ${failedMultisigs.length} vault(s) failed.` : ""}`,
        });
        updateImportContent("");
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
    updateImportContent("");
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
    updateImportContent("");
    setCopied(false);
    if (newMode === "export") {
      generateExport();
    }
  };

  useEffect(() => {
    if (mode === "export") {
      generateExport();
    }
  }, [chains, labels, mode, multisigs, providerAdapterSettings]);

  return (
    <>
      <div className="space-y-5">
        <ExportImportModePicker
          mode={mode}
          disabled={isImporting}
          onModeChange={handleModeChange}
        />

        {mode === "export" && exportContent && (
          <ExportImportExportPanel
            exportContent={exportContent}
            packageSummary={exportPackage?.summary ?? null}
            rawPreview={exportPackage?.rawPreview ?? null}
            copied={copied}
            onCopy={handleCopy}
            onSave={handleSaveYaml}
          />
        )}

        {mode === "import" && (
          <ExportImportImportPanel
            importContent={importContent}
            importReview={importReview}
            importProgress={importProgress}
            isImporting={isImporting}
            onImportContentChange={updateImportContent}
            onResetImportedState={handleOpenResetDialog}
            onReview={handleReviewImport}
            onImport={handleImport}
          />
        )}
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-destructive/20 bg-card max-w-[30rem] gap-0 overflow-hidden p-0"
        >
          <div className="border-destructive/15 border-b px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="border-destructive/20 bg-destructive/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                <AlertTriangle className="text-destructive h-5 w-5" />
              </div>
              <div className="space-y-2">
                <DialogTitle>Reset imported workspace state?</DialogTitle>
                <DialogDescription className="max-w-md text-[13px] leading-5">
                  Use this only when a YAML import left the local workspace in a
                  broken state. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="bg-muted grid gap-2 rounded-xl p-4">
              <p className="text-muted-foreground/50 text-[11px] font-medium">
                What gets cleared
              </p>
              <p className="text-foreground/80 text-[13px]">
                Saved vaults, custom chains, address labels, provider settings,
                and current workspace selections.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Vaults
                </p>
                <p className="text-foreground mt-1 text-[15px] font-semibold tabular-nums">
                  {multisigCount}
                </p>
              </div>
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Custom chains
                </p>
                <p className="text-foreground mt-1 text-[15px] font-semibold tabular-nums">
                  {customChainCount}
                </p>
              </div>
              <div className="bg-muted rounded-xl px-3 py-3">
                <p className="text-muted-foreground/50 text-[11px] font-medium">
                  Labels
                </p>
                <p className="text-foreground mt-1 text-[15px] font-semibold tabular-nums">
                  {labelCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 pt-2 pb-5">
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
  mode: "export" | "import";
  disabled?: boolean;
  onModeChange: (mode: "export" | "import") => void;
}

function ExportImportModePicker({
  mode,
  disabled = false,
  onModeChange,
}: ExportImportModePickerProps) {
  return (
    <div className="bg-muted dark:bg-background inline-flex self-start rounded-lg p-1">
      {(["export", "import"] as const).map((m) => (
        <button
          key={m}
          type="button"
          disabled={disabled}
          onClick={() => onModeChange(m)}
          className={cn(
            "rounded-md px-4 py-1.5 text-[13px] font-medium transition-all",
            mode === m
              ? "bg-card dark:bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground disabled:opacity-50"
          )}
        >
          {m === "export" ? "Export" : "Import"}
        </button>
      ))}
    </div>
  );
}

interface ExportImportExportPanelProps {
  exportContent: string;
  packageSummary: WorkspacePackageSummary | null;
  rawPreview: RawYamlPreview | null;
  copied: boolean;
  onCopy: () => void;
  onSave: () => void;
}

function ExportImportExportPanel({
  exportContent,
  packageSummary,
  rawPreview,
  copied,
  onCopy,
  onSave,
}: ExportImportExportPanelProps) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="border-border flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-foreground text-[13px] font-semibold">
            Workspace YAML package
          </p>
          <p className="text-muted-foreground/60 text-[11px]">
            Copy or save exports the complete package.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={onSave}>
            <Download className="h-4 w-4" />
            Save YAML
          </Button>
          <Button
            type="button"
            onClick={onCopy}
            disabled={copied}
            className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
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
      </div>
      {packageSummary ? (
        <WorkspacePackageSummaryView summary={packageSummary} />
      ) : null}
      <RawYamlPreviewView
        title="Raw YAML preview"
        preview={
          rawPreview ??
          buildRawYamlPreview(exportContent, { customAbiCount: 0 })
        }
      />
    </div>
  );
}

function WorkspacePackageSummaryView({
  summary,
}: {
  summary: WorkspacePackageSummary;
}) {
  const stats = [
    ["Chains", summary.counts.chains.toString()],
    ["Vaults", summary.counts.vaults.toString()],
    ["Labels", summary.counts.labels.toString()],
    ["Safe chains", summary.counts.safeChains.toString()],
    ["Custom ABIs", summary.counts.customAbis.toString()],
    ["Enabled ABIs", summary.counts.enabledCustomAbis.toString()],
    ["YAML size", formatBytes(summary.yamlBytes)],
    ["ABI source", formatBytes(summary.totalAbiSourceBytes)],
  ];

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-muted/50 rounded-lg px-3 py-2.5">
            <p className="text-muted-foreground/50 text-[10px] font-medium">
              {label}
            </p>
            <p className="text-foreground mt-1 text-[14px] font-semibold tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>

      {summary.abiRows.length > 0 ? (
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="border-border bg-muted/30 text-muted-foreground/60 grid grid-cols-[minmax(0,1fr)_5rem_5rem_6rem] gap-2 border-b px-3 py-2 text-[10px] font-medium">
            <span>ABI</span>
            <span>Status</span>
            <span>Functions</span>
            <span>Size</span>
          </div>
          <div className="divide-border divide-y">
            {summary.abiRows.map((row, index) => (
              <div
                key={`${row.label}-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_5rem_5rem_6rem] items-center gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-foreground truncate text-[12px] font-medium">
                    {row.label}
                  </p>
                  <p className="text-muted-foreground/50 text-[10px]">
                    {row.enabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <span
                  className={cn(
                    "w-fit rounded border px-1.5 py-px text-[10px]",
                    row.parseStatus === "valid"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive/25 bg-destructive/10 text-destructive"
                  )}
                  title={row.parseError ?? undefined}
                >
                  {row.parseStatus}
                </span>
                <span className="text-muted-foreground/70 text-[11px] tabular-nums">
                  {row.functionCount}
                </span>
                <span className="text-muted-foreground/70 text-[11px] tabular-nums">
                  {formatBytes(row.sourceBytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RawYamlPreviewView({
  title,
  preview,
}: {
  title: string;
  preview: RawYamlPreview;
}) {
  const [open, setOpen] = useState(!preview.defaultCollapsed);

  useEffect(() => {
    setOpen(!preview.defaultCollapsed);
  }, [preview.defaultCollapsed, preview.preview]);

  return (
    <details
      className="border-border border-t"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="hover:bg-muted/40 text-muted-foreground/70 flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-[12px] font-medium">
        <span>{title}</span>
        <span className="text-[11px] font-normal">
          {formatBytes(preview.byteLength)}
          {preview.isTruncated
            ? ` · ${formatBytes(preview.omittedBytes)} omitted`
            : ""}
        </span>
      </summary>
      <div className="bg-muted/30 max-h-[22rem] w-full overflow-auto">
        <pre className="text-muted-foreground/60 p-4 font-mono text-[11px] whitespace-pre">
          <code>{preview.preview}</code>
        </pre>
      </div>
    </details>
  );
}

type UrlFetchState = "idle" | "loading" | "success" | "error";

interface ExportImportImportPanelProps {
  importContent: string;
  importReview: ImportReviewState | null;
  importProgress: ImportProgressState | null;
  isImporting: boolean;
  onImportContentChange: (value: string) => void;
  onResetImportedState: () => void;
  onReview: () => void;
  onImport: () => void;
}

function ExportImportImportPanel({
  importContent,
  importReview,
  importProgress,
  isImporting,
  onImportContentChange,
  onResetImportedState,
  onReview,
  onImport,
}: ExportImportImportPanelProps) {
  const [urlInput, setUrlInput] = useState("");
  const [urlFetchState, setUrlFetchState] = useState<UrlFetchState>("idle");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const progressValue = importProgress
    ? (importProgress.current / importProgress.total) * 100
    : 0;

  const handleFetchUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlError("URL must start with https:// or http://");
      setUrlFetchState("error");
      return;
    }

    setUrlFetchState("loading");
    setUrlError(null);

    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      importFromYaml(text);
      onImportContentChange(text);
      setFileName(null);
      setFileError(null);
      setUrlFetchState("success");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Fetch failed";
      const isCors =
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("cors");
      setUrlError(
        isCors ? "CORS blocked — paste the YAML directly instead" : msg
      );
      setUrlFetchState("error");
    }
  };

  const handleClearUrl = () => {
    setUrlInput("");
    setUrlFetchState("idle");
    setUrlError(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      importFromYaml(text);
      onImportContentChange(text);
      setFileName(file.name);
      setFileError(null);
    } catch (error) {
      setFileName(null);
      setFileError(
        error instanceof Error ? error.message : "Failed to read YAML file"
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* URL fetch */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-center gap-2 border-b px-4 py-3">
          <Link className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
          <p className="text-muted-foreground/50 text-[11px] font-medium">
            Import from URL
          </p>
        </div>
        <div className="space-y-2 px-4 py-3">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (urlFetchState !== "idle") {
                    setUrlFetchState("idle");
                    setUrlError(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleFetchUrl();
                }}
                disabled={isImporting || urlFetchState === "loading"}
                placeholder="https://raw.githubusercontent.com/…/config.yaml"
                className={cn("pr-8 font-mono text-[11px]", urlInput && "pr-8")}
              />
              {urlInput && urlFetchState !== "loading" && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  className="text-muted-foreground/50 hover:text-muted-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                !urlInput.trim() || isImporting || urlFetchState === "loading"
              }
              onClick={() => void handleFetchUrl()}
              className={
                urlFetchState === "success"
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : ""
              }
            >
              {urlFetchState === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : urlFetchState === "success" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Fetched
                </>
              ) : (
                "Fetch"
              )}
            </Button>
          </div>
          {urlFetchState === "success" && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              YAML loaded and validated — review the package before importing.
            </p>
          )}
          {urlFetchState === "error" && urlError && (
            <p className="text-destructive text-[11px]">{urlError}</p>
          )}
        </div>
      </div>

      {/* Local file */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-center gap-2 border-b px-4 py-3">
          <FileText className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" />
          <p className="text-muted-foreground/50 text-[11px] font-medium">
            Import from file
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-foreground/80 truncate text-[12px]">
              {fileName ?? "Choose a local YAML package"}
            </p>
            {fileError ? (
              <p className="text-destructive mt-1 text-[11px]">{fileError}</p>
            ) : (
              <p className="text-muted-foreground/50 mt-1 text-[11px]">
                Useful for ABI-heavy exports that are awkward to paste.
              </p>
            )}
          </div>
          <label
            className={cn(
              "border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-medium",
              isImporting && "pointer-events-none opacity-50"
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Choose file
            <input
              type="file"
              accept=".yaml,.yml,text/yaml,application/x-yaml,text/plain"
              className="sr-only"
              disabled={isImporting}
              onChange={(event) => void handleFileChange(event)}
            />
          </label>
        </div>
      </div>

      {/* Reset state — intentionally de-emphasised, destructive action */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-muted-foreground/50 text-[11px]">
          Clears vaults, chains, labels &amp; settings — use only if a previous
          import left state broken.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isImporting}
          onClick={onResetImportedState}
          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 h-auto shrink-0 px-2 py-1 text-[11px]"
        >
          Reset state
        </Button>
      </div>

      {isImporting && importProgress ? (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="text-foreground text-[12px]">
              {importProgress.label}
            </p>
            <p className="text-muted-foreground/60 text-[11px] tabular-nums">
              {Math.min(importProgress.current, importProgress.total)} /{" "}
              {importProgress.total}
            </p>
          </div>
          <Progress value={progressValue} className="h-1 rounded-none" />
        </div>
      ) : null}

      <Textarea
        value={importContent}
        onChange={(e) => onImportContentChange(e.target.value)}
        disabled={isImporting}
        placeholder="Paste your YAML configuration here..."
        className="min-h-[12rem] resize-y rounded-xl font-mono text-xs"
      />

      {importReview ? (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <div className="border-border border-b px-4 py-3">
            <p className="text-foreground text-[13px] font-semibold">
              Import review
            </p>
            <p className="text-muted-foreground/60 text-[11px]">
              Review the package contents before applying it to this workspace.
            </p>
          </div>
          <WorkspacePackageSummaryView summary={importReview.summary} />
          <RawYamlPreviewView
            title="Import YAML preview"
            preview={importReview.rawPreview}
          />
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onReview}
          disabled={isImporting || !importContent.trim()}
        >
          Review package
        </Button>
        <Button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/80 border-primary/20"
          onClick={onImport}
          disabled={isImporting || !importReview}
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Import
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
