"use client";

import { Database, Layers3, Network, Tag } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { AddressLabelManagerController } from "@/components/address-label-manager-dialog";
import { ChainManagementController } from "@/components/chain-management-dialog";
import { ExportImportController } from "@/components/export-import-dialog";
import { ProviderAdaptersPanel } from "@/components/provider-adapters-panel";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import { useSettingsQuerySync } from "@/lib/hooks/use-settings-query-sync";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { WorkspaceSettingsSection } from "@/types/workspace";

const TABS: {
  id: WorkspaceSettingsSection;
  label: string;
  icon: typeof Network;
}[] = [
  { id: "chains", label: "Chains", icon: Network },
  { id: "adapters", label: "Adapters", icon: Layers3 },
  { id: "registry", label: "Export / import", icon: Database },
  { id: "labels", label: "Label manager", icon: Tag },
];

function SettingsPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { chains } = useChainStore();
  const { multisigs } = useMultisigStore();
  const { labels } = useAddressLabels();
  const { settingsActiveSection, setSettingsActiveSection } =
    useWorkspaceStore();

  useSettingsQuerySync({
    searchParams,
    pathname,
    replace: (href) => router.replace(href, { scroll: false }),
    activeSection: settingsActiveSection,
    setActiveSection: setSettingsActiveSection,
  });

  const sectionCounts = useMemo<Record<WorkspaceSettingsSection, number>>(
    () => ({
      chains: chains.length,
      adapters: chains.filter((chain) => chain.multisigProvider === "safe")
        .length,
      multisigs: multisigs.length,
      registry: multisigs.length,
      labels: labels.length,
    }),
    [chains, labels.length, multisigs.length]
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-0">
      <div className="border-border border-b pb-4">
        <h1 className="text-foreground text-2xl font-bold tracking-[-0.02em]">
          Settings
        </h1>
      </div>

      <div className="border-border -mb-px border-b">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = settingsActiveSection === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSettingsActiveSection(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-foreground -mb-px font-semibold"
                    : "text-muted-foreground/70 hover:text-foreground border-transparent"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                <span className="font-mono text-xs tabular-nums">
                  {sectionCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6">
        {settingsActiveSection === "chains" ? (
          <ChainManagementController embedded />
        ) : null}
        {settingsActiveSection === "adapters" ? (
          <ProviderAdaptersPanel />
        ) : null}
        {settingsActiveSection === "registry" ? (
          <ExportImportController embedded />
        ) : null}
        {settingsActiveSection === "labels" ? (
          <AddressLabelManagerController embedded />
        ) : null}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-full" />}>
      <SettingsPageContent />
    </Suspense>
  );
}
