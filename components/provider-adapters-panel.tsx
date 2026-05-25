"use client";

import { Network } from "lucide-react";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useChainStore } from "@/stores/chain-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";

export function ProviderAdaptersPanel() {
  const { chains } = useChainStore();
  const settings = useProviderAdapterStore((state) => state.settings);
  const updateSettings = useProviderAdapterStore(
    (state) => state.updateSettings
  );

  const liveSquadsChains = useMemo(
    () => chains.filter((chain) => chain.multisigProvider === "squads").length,
    [chains]
  );
  const safePreparedChains = useMemo(
    () => chains.filter((chain) => chain.multisigProvider === "safe").length,
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
      {/* Adapter status cards */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-foreground text-sm font-semibold">SVM / Squads</p>
              <p className="text-muted-foreground/60 text-xs">
                Active runtime used by the current workspace.
              </p>
            </div>
            <span className="border-primary/30 bg-primary/10 text-primary shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
              {liveSquadsChains} live
            </span>
          </div>
        </div>

        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-foreground text-sm font-semibold">EVM / Safe</p>
              <p className="text-muted-foreground/60 text-xs">
                Stored locally for upcoming adapter work.
              </p>
            </div>
            <span className="border-border text-muted-foreground/60 shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
              {safePreparedChains} chains
              {safeAdapterFieldsConfigured > 0 && ` · ${safeAdapterFieldsConfigured}/3 ready`}
            </span>
          </div>
        </div>
      </div>

      {/* Safe Adapter Configuration */}
      <div className="border-border bg-card rounded-xl border overflow-hidden">
        <div className="border-border/50 border-b px-4 py-3">
          <p className="text-muted-foreground/50 text-[11px] font-medium">Safe Adapter Configuration</p>
        </div>
        <div className="grid gap-0 lg:divide-x lg:divide-border/50 lg:grid-cols-3">
          <div className="space-y-1.5 px-4 py-3 border-border/50 border-b lg:border-b-0">
            <Label htmlFor="safe-tx-service" className="text-xs">Safe Transaction Service URL</Label>
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

          <div className="space-y-1.5 px-4 py-3 border-border/50 border-b lg:border-b-0">
            <Label htmlFor="safe-singleton" className="text-xs">Safe Singleton Address</Label>
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
            <Label htmlFor="safe-proxy-factory" className="text-xs">Safe Proxy Factory</Label>
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
        <div className="border-border/50 bg-muted/30 border-t px-4 py-2.5 flex items-center gap-2">
          <Network className="text-muted-foreground/50 h-3 w-3 shrink-0" />
          <p className="text-muted-foreground/60 text-xs">Saved locally. Applied when the Safe adapter is enabled.</p>
        </div>
      </div>
    </div>
  );
}
