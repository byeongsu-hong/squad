import yaml from "js-yaml";

import type { AddressLabel } from "@/types/address-label";
import { type ChainConfig, normalizeChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

export interface ExportData {
  version: string;
  exportedAt: string;
  chains?: ChainConfig[];
  multisigs?: SerializedMultisigAccount[];
  addressLabels?: AddressLabel[];
}

interface SerializedMultisigAccount {
  provider?: "squads" | "safe";
  publicKey: string;
  chainId: string;
  label?: string;
  tags: string[];
}

export function serializeMultisigAccount(
  multisig: MultisigAccount
): SerializedMultisigAccount {
  return {
    provider: multisig.provider,
    publicKey: multisig.publicKey.toString(),
    chainId: multisig.chainId,
    label: multisig.label,
    tags: multisig.tags ?? [],
  };
}

export function exportToYaml(data: ExportData): string {
  return yaml.dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

export function importFromYaml(yamlContent: string): ExportData {
  const data = yaml.load(yamlContent) as ExportData;

  if (!data || typeof data !== "object") {
    throw new Error("Invalid YAML format");
  }

  if (!data.version) {
    throw new Error("Missing version field");
  }

  if (data.multisigs) {
    data.multisigs = data.multisigs.map((multisig) => ({
      ...multisig,
      provider: multisig.provider ?? "squads",
      tags: Array.isArray(multisig.tags)
        ? multisig.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    }));
  }

  if (data.chains) {
    data.chains = data.chains.map(normalizeChainConfig);
  }

  return data;
}

export function exportChains(chains: ChainConfig[]): string {
  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    chains,
  };

  return exportToYaml(exportData);
}

export function exportMultisigs(multisigs: MultisigAccount[]): string {
  const serializedMultisigs = multisigs.map(serializeMultisigAccount);

  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    multisigs: serializedMultisigs,
  };

  return exportToYaml(exportData);
}

export function exportAll(
  chains: ChainConfig[],
  multisigs: MultisigAccount[],
  addressLabels: AddressLabel[]
): string {
  const serializedMultisigs = multisigs.map(serializeMultisigAccount);

  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    chains,
    multisigs: serializedMultisigs,
    addressLabels,
  };

  return exportToYaml(exportData);
}
