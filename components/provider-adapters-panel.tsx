"use client";

import { Network } from "lucide-react";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/stores/chain-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";
import { normalizeChainConfig } from "@/types/chain";

export function ProviderAdaptersPanel() {
  const { chains } = useChainStore();
  const settings = useProviderAdapterStore((state) => state.settings);
  const updateSettings = useProviderAdapterStore(
    (state) => state.updateSettings
  );

  const squadsChains = useMemo(
    () =>
      chains
        .map(normalizeChainConfig)
        .filter((c) => c.multisigProvider === "squads"),
    [chains]
  );
  const safeChains = useMemo(
    () =>
      chains
        .map(normalizeChainConfig)
        .filter((c) => c.multisigProvider === "safe"),
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

  return (
    <div className="space-y-4">
      {/* SVM / Squads */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-foreground text-[13px] font-semibold">
              SVM / Squads
            </p>
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
              <div
                key={chain.id}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-foreground text-[13px] font-medium">
                  {chain.name}
                </span>
                <div className="flex items-center gap-2">
                  {chain.squadsV4ProgramId ? (
                    <span className="rounded border border-emerald-300/60 bg-emerald-50 px-1.5 py-px font-mono text-[10px] text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">
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
            <p className="text-foreground text-[13px] font-semibold">
              EVM / Safe
            </p>
            <p className="text-muted-foreground/60 text-[11px]">
              Configure the Safe adapter for EVM multisig support.
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              safeAdapterFieldsConfigured === 3
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-amber-300/50 bg-amber-50/80 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400"
            )}
          >
            {safeChains.length} chain{safeChains.length !== 1 ? "s" : ""}
            {safeAdapterFieldsConfigured > 0 &&
              ` · ${safeAdapterFieldsConfigured}/3`}
          </span>
        </div>

        {safeChains.length > 0 && (
          <div className="border-border divide-border divide-y border-b px-4 py-1">
            {safeChains.map((chain) => (
              <div
                key={chain.id}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-foreground text-[13px] font-medium">
                  {chain.name}
                </span>
                {safeAdapterFieldsConfigured === 3 ? (
                  <span className="rounded border border-emerald-300/60 bg-emerald-50 px-1.5 py-px font-mono text-[10px] text-emerald-600 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                    ready
                  </span>
                ) : safeAdapterFieldsConfigured > 0 ? (
                  <span className="rounded border border-amber-300/50 bg-amber-50/80 px-1.5 py-px text-[10px] text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
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

        <div className="lg:divide-border grid gap-0 lg:grid-cols-3 lg:divide-x">
          <div className="border-border space-y-1.5 border-b px-4 py-3 lg:border-b-0">
            <label
              htmlFor="safe-tx-service"
              className="text-muted-foreground/50 text-[11px] font-medium"
            >
              Transaction Service URL
            </label>
            <Input
              id="safe-tx-service"
              value={settings.safeTransactionServiceUrl}
              onChange={(event) =>
                updateSettings({
                  safeTransactionServiceUrl: event.target.value,
                })
              }
              placeholder="https://safe-transaction-mainnet.safe.global"
              className="font-mono text-xs"
            />
          </div>

          <div className="border-border space-y-1.5 border-b px-4 py-3 lg:border-b-0">
            <label
              htmlFor="safe-singleton"
              className="text-muted-foreground/50 text-[11px] font-medium"
            >
              Singleton Address
            </label>
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
            <label
              htmlFor="safe-proxy-factory"
              className="text-muted-foreground/50 text-[11px] font-medium"
            >
              Proxy Factory
            </label>
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

        <div className="border-border bg-muted/30 flex items-center gap-2 border-t px-4 py-2.5">
          <Network className="text-muted-foreground/50 h-3 w-3 shrink-0" />
          <p className="text-muted-foreground/60 text-[11px]">
            Saved locally. Applied when importing a Safe vault on configured
            chains.
          </p>
        </div>
      </div>
    </div>
  );
}
