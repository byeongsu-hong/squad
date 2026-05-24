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
    <div className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="border-border bg-muted space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-medium">
                SVM / Squads
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Active runtime used by the current workspace.
              </p>
            </div>
            <span className="bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-xs font-medium">
              {liveSquadsChains} live
            </span>
          </div>
        </div>

        <div className="border-border bg-muted space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground text-sm font-medium">EVM / Safe</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Stored locally for upcoming adapter work.
              </p>
            </div>
            <span className="border-border bg-muted text-muted-foreground rounded-md border px-2 py-0.5 text-xs font-medium">
              {safePreparedChains} chains
              {safeAdapterFieldsConfigured > 0 && ` · ${safeAdapterFieldsConfigured}/3 ready`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="safe-tx-service">Safe Transaction Service URL</Label>
          <Input
            id="safe-tx-service"
            value={settings.safeTransactionServiceUrl}
            onChange={(event) =>
              updateSettings({ safeTransactionServiceUrl: event.target.value })
            }
            placeholder="https://safe-transaction-mainnet.safe.global"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="safe-singleton">Safe Singleton Address</Label>
          <Input
            id="safe-singleton"
            value={settings.safeSingletonAddress}
            onChange={(event) =>
              updateSettings({ safeSingletonAddress: event.target.value })
            }
            placeholder="0xd9Db270c1B5E3Bd161E8c8503c55ceABe..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="safe-proxy-factory">Safe Proxy Factory</Label>
          <Input
            id="safe-proxy-factory"
            value={settings.safeProxyFactoryAddress}
            onChange={(event) =>
              updateSettings({ safeProxyFactoryAddress: event.target.value })
            }
            placeholder="0xa6B71E26C5e0845f74c812102Ca7114b6a896Ab2"
          />
        </div>
      </div>

      <div className="border-border bg-muted text-muted-foreground flex items-start gap-2 rounded-lg border px-3 py-3 text-xs">
        <Network className="text-muted-foreground/70 mt-0.5 h-3.5 w-3.5 shrink-0" />
        These values are saved locally as adapter configuration only. They do
        not change the current Squads runtime yet.
      </div>
    </div>
  );
}
