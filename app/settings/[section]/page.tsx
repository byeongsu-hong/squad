"use client";

import { Database, Layers3, Network, Tag } from "lucide-react";
import Link from "next/link";
import { use, useMemo } from "react";

import { Button } from "@/components/ui/button";

import { AddressLabelManagerController } from "@/components/address-label-manager-dialog";
import { ChainManagementController } from "@/components/chain-management-dialog";
import { ExportImportController } from "@/components/export-import-dialog";
import { ProviderAdaptersPanel } from "@/components/provider-adapters-panel";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/stores/chain-store";
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

function isValidSection(s: string): s is WorkspaceSettingsSection {
  return s === "chains" || s === "adapters" || s === "registry" || s === "labels";
}

export default function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = use(params);
  const activeSection: WorkspaceSettingsSection = isValidSection(section)
    ? section
    : "chains";

  const { chains } = useChainStore();
  const { labels } = useAddressLabels();

  const sectionCounts = useMemo<Record<WorkspaceSettingsSection, number>>(
    () => ({
      chains: chains.length,
      adapters: chains.length,
      registry: 0,
      labels: labels.length,
    }),
    [chains, labels.length]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-0">
      <div className="border-border -mb-px border-b">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = activeSection === tab.id;
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                asChild
                className={cn(
                  "h-auto gap-1.5 rounded-none border-b-2 px-4 py-3 text-[13px] whitespace-nowrap transition-colors",
                  active
                    ? "border-transparent border-b-primary text-foreground -mb-px font-semibold hover:bg-transparent"
                    : "text-muted-foreground hover:text-foreground border-transparent hover:bg-transparent"
                )}
              >
                <Link href={`/settings/${tab.id}`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                  {sectionCounts[tab.id] > 0 && (
                    <span className="bg-muted text-muted-foreground/50 rounded px-1.5 py-px font-mono text-[10px] tabular-nums">
                      {sectionCounts[tab.id]}
                    </span>
                  )}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6">
        {activeSection === "chains" ? <ChainManagementController /> : null}
        {activeSection === "adapters" ? <ProviderAdaptersPanel /> : null}
        {activeSection === "registry" ? <ExportImportController /> : null}
        {activeSection === "labels" ? (
          <AddressLabelManagerController embedded />
        ) : null}
      </div>
    </div>
  );
}
