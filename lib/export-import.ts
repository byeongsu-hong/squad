import yaml from "js-yaml";

import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

export interface ExportData {
  version: string;
  exportedAt: string;
  chains?: ChainConfig[];
  multisigs?: SerializedMultisigAccount[];
}

interface SerializedMultisigAccount {
  publicKey: string;
  chainId: string;
  label?: string;
  tags?: string[];
}

export function serializeMultisigAccount(
  multisig: MultisigAccount
): SerializedMultisigAccount {
  return {
    publicKey: multisig.publicKey.toString(),
    chainId: multisig.chainId,
    label: multisig.label,
    tags: multisig.tags,
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
  multisigs: MultisigAccount[]
): string {
  const serializedMultisigs = multisigs.map(serializeMultisigAccount);

  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    chains,
    multisigs: serializedMultisigs,
  };

  return exportToYaml(exportData);
}
