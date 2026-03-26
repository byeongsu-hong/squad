"use client";

import { Layers3, Network } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "squad-provider-adapter-settings";

interface ProviderAdapterSettings {
  safeTransactionServiceUrl: string;
  safeSingletonAddress: string;
  safeProxyFactoryAddress: string;
}

const DEFAULT_SETTINGS: ProviderAdapterSettings = {
  safeTransactionServiceUrl: "",
  safeSingletonAddress: "",
  safeProxyFactoryAddress: "",
};

export function ProviderAdaptersPanel() {
  const [settings, setSettings] = useState<ProviderAdapterSettings>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SETTINGS;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<ProviderAdapterSettings>;
      return {
        safeTransactionServiceUrl: parsed.safeTransactionServiceUrl ?? "",
        safeSingletonAddress: parsed.safeSingletonAddress ?? "",
        safeProxyFactoryAddress: parsed.safeProxyFactoryAddress ?? "",
      };
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="space-y-4 border border-zinc-800 bg-zinc-950/55 p-4">
      <div className="space-y-1 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-violet-300" />
          <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
            Adapter Readiness
          </p>
        </div>
        <p className="text-sm leading-6 text-zinc-400">
          Keep future EVM Safe endpoints beside the current SVM chain
          configuration so extension work does not require another settings
          surface.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3 border border-zinc-800 bg-zinc-950/55 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">SVM / Squads</p>
              <p className="mt-1 text-xs text-zinc-500">
                Active runtime used by the current workspace.
              </p>
            </div>
            <Badge className="rounded-md bg-zinc-100 text-zinc-950">Live</Badge>
          </div>
        </div>

        <div className="space-y-3 border border-zinc-800 bg-zinc-950/55 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">EVM / Safe</p>
              <p className="mt-1 text-xs text-zinc-500">
                Stored locally for upcoming adapter work.
              </p>
            </div>
            <Badge
              variant="outline"
              className="rounded-md border-violet-500/30 bg-violet-500/10 text-violet-200"
            >
              Prepared
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="safe-tx-service">Safe Transaction Service URL</Label>
          <Input
            id="safe-tx-service"
            value={settings.safeTransactionServiceUrl}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                safeTransactionServiceUrl: event.target.value,
              }))
            }
            placeholder="https://safe-transaction-mainnet.safe.global"
            className="border-zinc-800 bg-zinc-950 text-zinc-100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safe-singleton">Safe Singleton Address</Label>
          <Input
            id="safe-singleton"
            value={settings.safeSingletonAddress}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                safeSingletonAddress: event.target.value,
              }))
            }
            placeholder="0xd9Db270c1B5E3Bd161E8c8503c55ceABe..."
            className="border-zinc-800 bg-zinc-950 text-zinc-100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safe-proxy-factory">Safe Proxy Factory</Label>
          <Input
            id="safe-proxy-factory"
            value={settings.safeProxyFactoryAddress}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                safeProxyFactoryAddress: event.target.value,
              }))
            }
            placeholder="0xa6B71E26C5e0845f74c812102Ca7114b6a896Ab2"
            className="border-zinc-800 bg-zinc-950 text-zinc-100"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 border border-zinc-800 bg-zinc-950/45 px-3 py-3 text-xs text-zinc-500">
        <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
        These values are saved locally as adapter configuration only. They do
        not change the current Squads runtime yet.
      </div>
    </div>
  );
}
