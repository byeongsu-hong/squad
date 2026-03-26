import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type {
  WorkspaceExplorerView,
  WorkspaceRegistryItem,
} from "@/types/workspace";

export interface RegistryAttentionSummary {
  waiting: number;
  executable: number;
  active: number;
}

export interface RegistrySummaryRow {
  key: string;
  label: string;
  chainId: string;
  chainName: string;
  threshold: number;
  memberCount: number;
  tags: string[];
  waiting: number;
  executable: number;
  active: number;
  attentionLine: string;
  hasAttention: boolean;
  searchText: string;
}

function buildAttentionLine(summary: RegistryAttentionSummary | null) {
  if (!summary) {
    return "Attention loading";
  }

  if (summary.waiting > 0) {
    return `${summary.waiting} waiting on you · ${summary.executable} executable · ${summary.active} active`;
  }

  if (summary.executable > 0) {
    return `${summary.executable} executable · ${summary.active} active`;
  }

  return `${summary.active} active`;
}

function toSearchText(parts: Array<string | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();
}

export function buildRegistrySummaryRowsFromMultisigs({
  multisigs,
  chains,
  attentionByMultisig,
  searchNeedle,
}: {
  multisigs: MultisigAccount[];
  chains: ChainConfig[];
  attentionByMultisig: Record<string, RegistryAttentionSummary | null>;
  searchNeedle: string;
}): RegistrySummaryRow[] {
  const needle = searchNeedle.trim().toLowerCase();

  return multisigs
    .map((multisig) => {
      const chainName =
        chains.find((chain) => chain.id === multisig.chainId)?.name ??
        multisig.chainId;
      const attention =
        attentionByMultisig[multisig.publicKey.toString()] ?? null;

      return {
        key: multisig.publicKey.toString(),
        label: multisig.label || "Unnamed",
        chainId: multisig.chainId,
        chainName,
        threshold: multisig.threshold,
        memberCount: multisig.members.length,
        tags: multisig.tags ?? [],
        waiting: attention?.waiting ?? 0,
        executable: attention?.executable ?? 0,
        active: attention?.active ?? 0,
        attentionLine: buildAttentionLine(attention),
        hasAttention: Boolean(
          attention && (attention.waiting > 0 || attention.executable > 0)
        ),
        searchText: toSearchText([
          multisig.label,
          multisig.publicKey.toString(),
          chainName,
          multisig.chainId,
          ...(multisig.tags ?? []),
        ]),
      } satisfies RegistrySummaryRow;
    })
    .filter((row) => !needle || row.searchText.includes(needle));
}

export function buildRegistrySummaryRowsFromWorkspaceItems({
  registryItems,
  searchNeedle,
}: {
  registryItems: WorkspaceRegistryItem[];
  searchNeedle: string;
}): RegistrySummaryRow[] {
  const needle = searchNeedle.trim().toLowerCase();

  return registryItems
    .map((item) => ({
      key: item.multisig.key,
      label: item.multisig.label || "Unnamed",
      chainId: item.multisig.chainId,
      chainName: item.multisig.chainName,
      threshold: item.multisig.threshold,
      memberCount: item.multisig.members.length,
      tags: item.multisig.tags,
      waiting: item.waiting,
      executable: item.executable,
      active: item.active,
      attentionLine: buildAttentionLine(item),
      hasAttention: item.waiting > 0 || item.executable > 0,
      searchText: toSearchText([
        item.multisig.label,
        item.multisig.key,
        item.multisig.chainName,
        item.multisig.chainId,
        ...item.multisig.tags,
      ]),
    }))
    .filter((row) => !needle || row.searchText.includes(needle));
}

export function buildRegistryExplorerViews(
  rows: RegistrySummaryRow[]
): WorkspaceExplorerView[] {
  const attentionKeys = rows
    .filter((row) => row.hasAttention)
    .map((row) => row.key);
  const untaggedKeys = rows
    .filter((row) => row.tags.length === 0)
    .map((row) => row.key);

  const chainViews = Array.from(
    new Map(
      rows.map((row) => [
        `chain:${row.chainName}`,
        {
          id: `chain:${row.chainName}`,
          label: row.chainName,
          multisigKeys: rows
            .filter((entry) => entry.chainName === row.chainName)
            .map((entry) => entry.key),
          description: "Chain scope",
          meta: `${rows.filter((entry) => entry.chainName === row.chainName).length} multisigs`,
        } satisfies WorkspaceExplorerView,
      ])
    ).values()
  );

  const tagViews = Array.from(
    new Map(
      rows
        .flatMap((row) =>
          row.tags.map((tag) => [
            `tag:${tag}`,
            {
              id: `tag:${tag}`,
              label: tag,
              multisigKeys: rows
                .filter((entry) => entry.tags.includes(tag))
                .map((entry) => entry.key),
              description: "Saved grouping",
              meta: `${rows.filter((entry) => entry.tags.includes(tag)).length} multisigs`,
            } satisfies WorkspaceExplorerView,
          ])
        )
        .filter((entry): entry is [string, WorkspaceExplorerView] =>
          Boolean(entry)
        )
    ).values()
  );

  return [
    {
      id: "all",
      label: "All multisigs",
      multisigKeys: rows.map((row) => row.key),
      description: "Everything in scope",
      meta: `${rows.length} multisigs`,
    },
    {
      id: "attention",
      label: "Needs attention",
      multisigKeys: attentionKeys,
      description: "Waiting on you or ready to execute",
      meta: `${attentionKeys.length} multisigs`,
    },
    ...chainViews,
    {
      id: "tag:none",
      label: "No tags",
      multisigKeys: untaggedKeys,
      description: "Multisigs without saved tags",
      meta: `${untaggedKeys.length} multisigs`,
    },
    ...tagViews,
  ].filter((view) => view.multisigKeys.length > 0 || view.id === "all");
}
