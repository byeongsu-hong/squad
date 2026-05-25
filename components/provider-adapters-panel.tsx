"use client";

import { Network, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { parseCustomAbiSource } from "@/lib/safe-custom-abi";
import { cn } from "@/lib/utils";
import { normalizeChainConfig } from "@/types/chain";
import { useChainStore } from "@/stores/chain-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";

export function ProviderAdaptersPanel() {
  const { chains } = useChainStore();
  const settings = useProviderAdapterStore((state) => state.settings);
  const updateSettings = useProviderAdapterStore(
    (state) => state.updateSettings
  );

  const squadsChains = useMemo(
    () => chains.map(normalizeChainConfig).filter((c) => c.multisigProvider === "squads"),
    [chains]
  );
  const safeChains = useMemo(
    () => chains.map(normalizeChainConfig).filter((c) => c.multisigProvider === "safe"),
    [chains]
  );
  const safeAdapterFieldsConfigured = useMemo(
    () =>
      [
        settings.safeTransactionServiceUrl,
        settings.safeSingletonAddress,
        settings.safeProxyFactoryAddress,
      ].filter(Boolean).length,
    [
      settings.safeProxyFactoryAddress,
      settings.safeSingletonAddress,
      settings.safeTransactionServiceUrl,
    ]
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
    <div className="space-y-4">
      {/* SVM / Squads */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-foreground text-[13px] font-semibold">SVM / Squads</p>
            <p className="text-muted-foreground/60 text-[11px]">
              Native Squads multisig runtime — active and ready.
            </p>
          </div>
          <span className="border-primary/30 bg-primary/10 text-primary shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
            {squadsChains.length} active
          </span>
        </div>
        {squadsChains.length > 0 && (
          <div className="divide-border divide-y px-4 py-1">
            {squadsChains.map((chain) => (
              <div key={chain.id} className="flex items-center justify-between py-2.5">
                <span className="text-foreground text-[13px] font-medium">{chain.name}</span>
                <div className="flex items-center gap-2">
                  {chain.squadsV4ProgramId ? (
                    <span className="border-emerald-300/60 bg-emerald-50 text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400 rounded border px-1.5 py-px font-mono text-[10px]">
                      ready
                    </span>
                  ) : (
                    <span className="border-border text-muted-foreground/50 rounded border px-1.5 py-px text-[10px]">
                      no program
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EVM / Safe */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-foreground text-[13px] font-semibold">EVM / Safe</p>
            <p className="text-muted-foreground/60 text-[11px]">
              Configure the Safe adapter for EVM multisig support.
            </p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            safeAdapterFieldsConfigured === 3
              ? "border-emerald-300/60 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "border-amber-300/50 bg-amber-50/80 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400"
          )}>
            {safeChains.length} chain{safeChains.length !== 1 ? "s" : ""}
            {safeAdapterFieldsConfigured > 0 && ` · ${safeAdapterFieldsConfigured}/3`}
          </span>
        </div>

        {safeChains.length > 0 && (
          <div className="border-border divide-border divide-y border-b px-4 py-1">
            {safeChains.map((chain) => (
              <div key={chain.id} className="flex items-center justify-between py-2.5">
                <span className="text-foreground text-[13px] font-medium">{chain.name}</span>
                {safeAdapterFieldsConfigured === 3 ? (
                  <span className="border-emerald-300/60 bg-emerald-50 text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400 rounded border px-1.5 py-px font-mono text-[10px]">
                    ready
                  </span>
                ) : safeAdapterFieldsConfigured > 0 ? (
                  <span className="border-amber-300/50 bg-amber-50/80 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400 rounded border px-1.5 py-px text-[10px]">
                    partial
                  </span>
                ) : (
                  <span className="border-border text-muted-foreground/40 rounded border px-1.5 py-px text-[10px]">
                    not set
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-0 lg:divide-x lg:divide-border lg:grid-cols-3">
          <div className="space-y-1.5 border-border border-b px-4 py-3 lg:border-b-0">
            <label htmlFor="safe-tx-service" className="text-[11px] font-medium text-muted-foreground/50">Transaction Service URL</label>
            <Input
              id="safe-tx-service"
              value={settings.safeTransactionServiceUrl}
              onChange={(event) =>
                updateSettings({ safeTransactionServiceUrl: event.target.value })
              }
              placeholder="https://safe-transaction-mainnet.safe.global"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5 border-border border-b px-4 py-3 lg:border-b-0">
            <label htmlFor="safe-singleton" className="text-[11px] font-medium text-muted-foreground/50">Singleton Address</label>
            <Input
              id="safe-singleton"
              value={settings.safeSingletonAddress}
              onChange={(event) =>
                updateSettings({ safeSingletonAddress: event.target.value })
              }
              placeholder="0xd9Db270c1B5E3Bd161E8c8503c55ceABe..."
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5 px-4 py-3">
            <label htmlFor="safe-proxy-factory" className="text-[11px] font-medium text-muted-foreground/50">Proxy Factory</label>
            <Input
              id="safe-proxy-factory"
              value={settings.safeProxyFactoryAddress}
              onChange={(event) =>
                updateSettings({ safeProxyFactoryAddress: event.target.value })
              }
              placeholder="0xa6B71E26C5e0845f74c812102Ca7114b6a896Ab2"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="border-border border-t">
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
              <Button type="button" size="sm" variant="outline" onClick={addCustomAbi}>
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
                      className="h-8 w-8 text-muted-foreground/50 hover:text-destructive"
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
            <div className="px-4 py-4">
              <p className="text-muted-foreground/50 text-[12px]">
                No custom ABIs configured.
              </p>
            </div>
          )}
        </div>

        <div className="border-border bg-muted/30 flex items-center gap-2 border-t px-4 py-2.5">
          <Network className="text-muted-foreground/50 h-3 w-3 shrink-0" />
          <p className="text-muted-foreground/60 text-[11px]">Saved locally. Applied when importing a Safe vault on configured chains.</p>
        </div>
      </div>
    </div>
  );
}
