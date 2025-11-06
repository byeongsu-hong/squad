"use client";

import { Check, Copy, Download, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  type ExportData,
  exportAll,
  importFromYaml,
} from "@/lib/export-import";
import { SquadService } from "@/lib/squad";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export function ExportImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"export" | "import">("export");
  const [exportContent, setExportContent] = useState<string>("");
  const [importContent, setImportContent] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { chains, addChain } = useChainStore();
  const { multisigs, addMultisig } = useMultisigStore();

  const generateExport = () => {
    try {
      const content = exportAll(chains, multisigs);
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

      let importedChains = 0;
      let importedMultisigs = 0;
      const failedMultisigs: string[] = [];

      // Step 1: Import chains first
      const newChains: typeof chains = [...chains];
      if (data.chains) {
        for (const chain of data.chains) {
          const exists = newChains.some((c) => c.id === chain.id);
          if (!exists) {
            addChain(chain);
            newChains.push(chain);
            importedChains++;
          }
        }
      }

      // Step 2: Import multisigs after chains are added
      if (data.multisigs) {
        for (const serializedMultisig of data.multisigs) {
          try {
            // Check for duplicates using chainId + publicKey
            const exists = multisigs.some(
              (m) =>
                m.publicKey.toString() === serializedMultisig.publicKey &&
                m.chainId === serializedMultisig.chainId
            );
            if (exists) {
              continue;
            }

            // Find chain (including newly added ones)
            const chain = newChains.find(
              (c) => c.id === serializedMultisig.chainId
            );
            if (!chain) {
              failedMultisigs.push(
                `${serializedMultisig.publicKey} (chain not found: ${serializedMultisig.chainId})`
              );
              continue;
            }

            const squadService = new SquadService(
              chain.rpcUrl,
              chain.squadsV4ProgramId
            );

            const { PublicKey } = await import("@solana/web3.js");
            const multisigPda = new PublicKey(serializedMultisig.publicKey);
            const multisigData = await squadService.getMultisig(
              multisigPda,
              false
            );

            const multisigAccount: MultisigAccount = {
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
              programId: new PublicKey(chain.squadsV4ProgramId),
              chainId: chain.id,
              label: serializedMultisig.label,
              tags: serializedMultisig.tags,
            };

            addMultisig(multisigAccount);
            importedMultisigs++;
          } catch (error) {
            console.error(
              `Failed to import multisig ${serializedMultisig.publicKey}:`,
              error
            );
            failedMultisigs.push(
              `${serializedMultisig.publicKey} (${error instanceof Error ? error.message : "unknown error"})`
            );
          }
        }
      }

      const messages = [];
      if (importedChains > 0) {
        messages.push(`${importedChains} chain(s)`);
      }
      if (importedMultisigs > 0) {
        messages.push(`${importedMultisigs} multisig(s)`);
      }

      if (messages.length > 0) {
        toast.success("Import successful", {
          description: `Imported ${messages.join(" and ")}${failedMultisigs.length > 0 ? `. ${failedMultisigs.length} multisig(s) failed.` : ""}`,
        });
        setImportContent("");
        setIsOpen(false);
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
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsOpen(open);
    if (open && mode === "export") {
      generateExport();
    }
    if (!open) {
      setExportContent("");
      setImportContent("");
      setCopied(false);
    }
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

        <div className="flex-1 space-y-6 overflow-y-auto py-4">
          <RadioGroup value={mode} onValueChange={handleModeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="export" id="export" />
              <Label htmlFor="export" className="cursor-pointer font-normal">
                Export to YAML
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="import" id="import" />
              <Label htmlFor="import" className="cursor-pointer font-normal">
                Import from YAML
              </Label>
            </div>
          </RadioGroup>

          {mode === "export" && exportContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>YAML Configuration:</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
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
              </div>
              <div className="h-[400px] w-full overflow-auto rounded-md border">
                <pre className="p-4 text-xs whitespace-pre">
                  <code>{exportContent}</code>
                </pre>
              </div>
            </div>
          )}

          {mode === "import" && (
            <div className="space-y-3">
              <Label>Paste YAML content:</Label>
              <p className="text-muted-foreground text-sm">
                Existing items will be preserved. Only new items will be
                imported.
              </p>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder="Paste your YAML configuration here..."
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[300px] w-full resize-none overflow-auto rounded-md border px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          {mode === "import" && (
            <Button onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
