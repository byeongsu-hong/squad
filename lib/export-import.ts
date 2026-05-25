import yaml from "js-yaml";

import type { AddressLabel } from "@/types/address-label";
import { type ChainConfig, normalizeChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type {
  ProviderAdapterSettings,
  ProviderAdaptersConfig,
} from "@/types/provider-adapter";
import {
  normalizeProviderAdapters,
  serializeProviderAdapters,
} from "@/types/provider-adapter";

export interface ExportData {
  version: string;
  exportedAt: string;
  chains?: ChainConfig[];
  providerAdapters?: ProviderAdaptersConfig;
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

  data.providerAdapters = normalizeProviderAdapters(data.providerAdapters);

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
  addressLabels: AddressLabel[],
  providerAdapterSettings?: ProviderAdapterSettings
): string {
  const serializedMultisigs = multisigs.map(serializeMultisigAccount);
  const providerAdapters = serializeProviderAdapters(providerAdapterSettings);

  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    chains,
    ...(providerAdapters ? { providerAdapters } : {}),
    multisigs: serializedMultisigs,
    addressLabels,
  };

  return exportToYaml(exportData);
}
