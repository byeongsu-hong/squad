"use client";

import { Code2, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseCustomAbiSource } from "@/lib/safe-custom-abi";
import { cn } from "@/lib/utils";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";

export function CustomAbisPanel() {
  const settings = useProviderAdapterStore((state) => state.settings);
  const updateSettings = useProviderAdapterStore(
    (state) => state.updateSettings
  );

  const customAbiRows = useMemo(
    () =>
      settings.safeCustomAbis.map((customAbi) => ({
        ...customAbi,
        parsed: parseCustomAbiSource(customAbi.source),
      })),
    [settings.safeCustomAbis]
  );
  const enabledCustomAbiCount = settings.safeCustomAbis.filter(
    (customAbi) => customAbi.enabled
  ).length;

  const updateCustomAbi = (
    index: number,
    updates: Partial<(typeof settings.safeCustomAbis)[number]>
  ) => {
    updateSettings({
      safeCustomAbis: settings.safeCustomAbis.map((customAbi, itemIndex) =>
        itemIndex === index ? { ...customAbi, ...updates } : customAbi
      ),
    });
  };

  const addCustomAbi = () => {
    updateSettings({
      safeCustomAbis: [
        ...settings.safeCustomAbis,
        {
          label: `Custom ABI ${settings.safeCustomAbis.length + 1}`,
          enabled: true,
          source: "",
        },
      ],
    });
  };

  const removeCustomAbi = (index: number) => {
    updateSettings({
      safeCustomAbis: settings.safeCustomAbis.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  };

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground text-[13px] font-semibold">
            Custom decode ABIs
          </p>
          <p className="text-muted-foreground/60 text-[11px]">
            Enabled entries decode Safe calldata before service fallback.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="border-border text-muted-foreground/60 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
            {enabledCustomAbiCount}/{settings.safeCustomAbis.length}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustomAbi}
          >
            <Plus className="h-3.5 w-3.5" />
            Add ABI
          </Button>
        </div>
      </div>

      {customAbiRows.length > 0 ? (
        <div className="divide-border divide-y">
          {customAbiRows.map((customAbi, index) => (
            <div key={index} className="space-y-3 px-4 py-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <Input
                  value={customAbi.label}
                  onChange={(event) =>
                    updateCustomAbi(index, { label: event.target.value })
                  }
                  placeholder="ERC20"
                  className="h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateCustomAbi(index, { enabled: !customAbi.enabled })
                  }
                  className={cn(
                    "h-8 rounded-md border px-3 text-[11px] font-medium",
                    customAbi.enabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-border text-muted-foreground/60"
                  )}
                >
                  {customAbi.enabled ? "Enabled" : "Disabled"}
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCustomAbi(index)}
                  className="text-muted-foreground/50 hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                value={customAbi.source}
                onChange={(event) =>
                  updateCustomAbi(index, { source: event.target.value })
                }
                placeholder="Paste JSON ABI, artifact JSON, or function signatures"
                className="min-h-28 resize-y font-mono text-[11px]"
              />
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span
                  className={cn(
                    customAbi.parsed.ok
                      ? "text-emerald-600 dark:text-emerald-400"
                      : customAbi.source.trim()
                        ? "text-destructive"
                        : "text-muted-foreground/50"
                  )}
                >
                  {customAbi.parsed.ok
                    ? `${customAbi.parsed.functionCount} function(s)`
                    : customAbi.source.trim()
                      ? customAbi.parsed.error
                      : "Waiting for ABI source"}
                </span>
                <span className="text-muted-foreground/40">
                  {customAbi.source.length.toLocaleString()} chars
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-4">
          <Code2 className="text-muted-foreground/40 h-4 w-4 shrink-0" />
          <p className="text-muted-foreground/50 text-[12px]">
            No custom ABIs configured.
          </p>
        </div>
      )}
    </div>
  );
}
