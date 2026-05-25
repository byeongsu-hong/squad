"use client";

import { Database, Layers3, Network, Tag } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

import { Button } from "@/components/ui/button";

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
  { id: "registry", label: "Export/Import", icon: Database },
  { id: "labels", label: "Labels", icon: Tag },
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
      adapters: chains.length,
      multisigs: multisigs.length,
      registry: 0,
      labels: labels.length,
    }),
    [chains, labels.length, multisigs.length]
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-0">
      <div className="border-border -mb-px border-b">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = settingsActiveSection === tab.id;
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                onClick={() => setSettingsActiveSection(tab.id)}
                className={cn(
                  "h-auto gap-1.5 rounded-none border-b-2 px-4 py-3 text-[13px] whitespace-nowrap transition-colors",
                  active
                    ? "border-transparent border-b-primary text-foreground -mb-px font-semibold hover:bg-transparent"
                    : "text-muted-foreground/70 hover:text-foreground border-transparent hover:bg-transparent"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
                {sectionCounts[tab.id] > 0 && (
                  <span className="bg-muted text-muted-foreground/50 rounded px-1.5 py-px font-mono text-[10px] tabular-nums">
                    {sectionCounts[tab.id]}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6">
        {settingsActiveSection === "chains" ? (
          <ChainManagementController />
        ) : null}
        {settingsActiveSection === "adapters" ? (
          <ProviderAdaptersPanel />
        ) : null}
        {settingsActiveSection === "registry" ? (
          <ExportImportController />
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
