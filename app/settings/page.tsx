"use client";

import { Boxes, Database, Network, Tag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { AddMultisigActions } from "@/components/add-multisig-actions";
import { AddressLabelManagerController } from "@/components/address-label-manager-dialog";
import { ChainManagementController } from "@/components/chain-management-dialog";
import { ExportImportController } from "@/components/export-import-dialog";
import { MultisigList } from "@/components/multisig-list";
import { ProviderAdaptersPanel } from "@/components/provider-adapters-panel";
import { useAddressLabels } from "@/lib/hooks/use-address-label";
import { cn } from "@/lib/utils";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { WorkspaceSettingsSection } from "@/types/workspace";

const SECTION_COPY: Record<
  WorkspaceSettingsSection,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: typeof Network;
    accent: string;
  }
> = {
  chains: {
    eyebrow: "Network Control",
    title: "Chain settings",
    description:
      "Maintain the RPC and explorer endpoints that define where this workspace reads and signs.",
    icon: Network,
    accent: "text-cyan-300",
  },
  multisigs: {
    eyebrow: "Registry Management",
    title: "Multisig registry",
    description:
      "Create, import, relabel, retag, and remove saved multisigs from one dedicated admin surface.",
    icon: Boxes,
    accent: "text-lime-300",
  },
  registry: {
    eyebrow: "Registry Data",
    title: "Export and import",
    description:
      "Move chain and multisig YAML definitions between local environments without leaving settings.",
    icon: Database,
    accent: "text-amber-300",
  },
  labels: {
    eyebrow: "Address Labels",
    title: "Label manager",
    description:
      "Keep signer maps and proposal metadata readable with reusable address naming.",
    icon: Tag,
    accent: "text-emerald-300",
  },
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-800 bg-zinc-950/75 px-3 py-2">
      <p className="text-[0.62rem] tracking-[0.18em] text-zinc-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { chains } = useChainStore();
  const { multisigs } = useMultisigStore();
  const { labels } = useAddressLabels();
  const { settingsActiveSection, setSettingsActiveSection } =
    useWorkspaceStore();

  useEffect(() => {
    const requestedSection = searchParams.get("section");
    if (
      requestedSection === "chains" ||
      requestedSection === "multisigs" ||
      requestedSection === "registry" ||
      requestedSection === "labels"
    ) {
      setSettingsActiveSection(requestedSection);
    }
  }, [searchParams, setSettingsActiveSection]);

  const sectionMeta = useMemo(
    () => [
      {
        id: "chains" as const,
        count: chains.length,
        summary: `${chains.filter((chain) => chain.id.startsWith("custom-")).length} custom`,
      },
      {
        id: "multisigs" as const,
        count: multisigs.length,
        summary: "saved workspaces",
      },
      {
        id: "registry" as const,
        count: multisigs.length,
        summary: "yaml transport",
      },
      {
        id: "labels" as const,
        count: labels.length,
        summary: "saved aliases",
      },
    ],
    [chains, labels.length, multisigs.length]
  );

  const currentSection = SECTION_COPY[settingsActiveSection];
  const CurrentIcon = currentSection.icon;

  return (
    <div className="min-h-full space-y-4">
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-[0.72rem] font-medium tracking-[0.22em] text-zinc-500 uppercase">
              Settings
            </p>
            <h1 className="text-[clamp(1.5rem,2.4vw,2.35rem)] font-semibold tracking-[-0.05em] text-zinc-50">
              Workspace administration
            </h1>
            <p className="max-w-[52rem] text-sm leading-6 text-zinc-400">
              Keep network definitions, portable registry data, and address
              naming under one controlled surface instead of scattering admin
              tasks across header dialogs.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[26rem]">
            <StatPill label="Chains" value={String(chains.length)} />
            <StatPill label="Multisigs" value={String(multisigs.length)} />
            <StatPill label="Labels" value={String(labels.length)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-3 border border-zinc-800 bg-zinc-950/35 p-3">
          <div className="border-b border-zinc-800 pb-3">
            <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
              Control Surface
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Select the admin area you want to work on.
            </p>
          </div>

          <div className="space-y-2">
            {sectionMeta.map((section) => {
              const copy = SECTION_COPY[section.id];
              const Icon = copy.icon;
              const selected = settingsActiveSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSettingsActiveSection(section.id)}
                  className={cn(
                    "w-full border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-zinc-700 bg-zinc-100 text-zinc-950"
                      : "border-zinc-800 bg-zinc-950/75 text-zinc-200 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            selected ? "text-zinc-950" : copy.accent
                          )}
                        />
                        <p className="text-sm font-medium">{copy.title}</p>
                      </div>
                      <p
                        className={cn(
                          "text-[0.68rem] tracking-[0.16em] uppercase",
                          selected ? "text-zinc-600" : "text-zinc-500"
                        )}
                      >
                        {copy.eyebrow}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[0.72rem] tabular-nums",
                        selected ? "text-zinc-700" : "text-zinc-500"
                      )}
                    >
                      {section.count}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-xs",
                      selected ? "text-zinc-700" : "text-zinc-500"
                    )}
                  >
                    {section.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4 border border-zinc-800 bg-zinc-950/45 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CurrentIcon className={cn("h-4 w-4", currentSection.accent)} />
                <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                  {currentSection.eyebrow}
                </p>
              </div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-50">
                {currentSection.title}
              </h2>
              <p className="max-w-[46rem] text-sm leading-6 text-zinc-400">
                {currentSection.description}
              </p>
            </div>
          </div>

          {settingsActiveSection === "chains" ? (
            <div className="space-y-5">
              <ChainManagementController embedded />
              <ProviderAdaptersPanel />
            </div>
          ) : null}
          {settingsActiveSection === "multisigs" ? (
            <MultisigList
              embedded
              actions={<AddMultisigActions />}
              statusText="Create, import, relabel, retag, and clean up stored multisigs from the main admin surface."
            />
          ) : null}
          {settingsActiveSection === "registry" ? (
            <div className="space-y-4 border border-zinc-800 bg-zinc-950/55 p-4">
              <div className="space-y-1 border-b border-zinc-800 pb-4">
                <p className="text-[0.68rem] tracking-[0.18em] text-zinc-500 uppercase">
                  YAML Transport
                </p>
                <p className="text-sm leading-6 text-zinc-400">
                  Move chain and multisig config between local environments
                  without leaving settings.
                </p>
              </div>
              <ExportImportController embedded />
            </div>
          ) : null}
          {settingsActiveSection === "labels" ? (
            <AddressLabelManagerController embedded />
          ) : null}
        </section>
      </div>
    </div>
  );
}
