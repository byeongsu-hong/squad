import { type ChainConfig, normalizeChainConfig } from "@/types/chain";
import { type MultisigAccount, getMultisigAccountKey } from "@/types/multisig";

interface RegistryAttentionSummary {
  waiting: number;
  executable: number;
  active: number;
}

export interface RegistrySummaryRow {
  key: string;
  label: string;
  chainId: string;
  chainName: string;
  vmFamily: string;
  multisigProvider: string;
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
  if (!summary) return "";

  if (summary.waiting > 0) {
    const parts = [`${summary.waiting} waiting`];
    if (summary.executable > 0) parts.push(`${summary.executable} ready`);
    return parts.join(" · ");
  }

  if (summary.executable > 0) {
    return `${summary.executable} ready to execute`;
  }

  if (summary.active > 0) {
    return `${summary.active} active`;
  }

  return "";
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
      const chainConfig = chains.find((chain) => chain.id === multisig.chainId);
      const normalizedChain = chainConfig
        ? normalizeChainConfig(chainConfig)
        : null;
      const chainName = normalizedChain?.name ?? multisig.chainId;
      const attention =
        attentionByMultisig[getMultisigAccountKey(multisig)] ?? null;

      return {
        key: getMultisigAccountKey(multisig),
        label: multisig.label || "Unnamed",
        chainId: multisig.chainId,
        chainName,
        vmFamily: normalizedChain?.vmFamily ?? "svm",
        multisigProvider: normalizedChain?.multisigProvider ?? "squads",
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
