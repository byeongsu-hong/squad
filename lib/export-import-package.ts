import type { ExportData } from "@/lib/export-import";
import { parseCustomAbiSource } from "@/lib/safe-custom-abi";
import type { SafeCustomAbiEntry } from "@/types/provider-adapter";

export const RAW_YAML_PREVIEW_LIMIT = 64 * 1024;

export interface RawYamlPreview {
  preview: string;
  byteLength: number;
  isTruncated: boolean;
  omittedBytes: number;
  defaultCollapsed: boolean;
}

export interface WorkspacePackageAbiRow {
  label: string;
  enabled: boolean;
  functionCount: number;
  parseStatus: "valid" | "invalid";
  parseError: string | null;
  sourceBytes: number;
}

export interface WorkspacePackageSummary {
  counts: {
    chains: number;
    vaults: number;
    labels: number;
    safeChains: number;
    customAbis: number;
    enabledCustomAbis: number;
    invalidCustomAbis: number;
  };
  yamlBytes: number;
  totalAbiSourceBytes: number;
  abiRows: WorkspacePackageAbiRow[];
}

export function getStringByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function getSafeCustomAbisFromExportData(
  data: Pick<ExportData, "providerAdapters">
): SafeCustomAbiEntry[] {
  return data.providerAdapters?.evm?.safe?.customAbis ?? [];
}

export function buildRawYamlPreview(
  content: string,
  options: { customAbiCount?: number } = {}
): RawYamlPreview {
  const byteLength = getStringByteLength(content);
  const preview = content.slice(0, RAW_YAML_PREVIEW_LIMIT);
  const previewBytes = getStringByteLength(preview);
  const isTruncated = byteLength > previewBytes;

  return {
    preview,
    byteLength,
    isTruncated,
    omittedBytes: isTruncated ? byteLength - previewBytes : 0,
    defaultCollapsed:
      (options.customAbiCount ?? 0) > 0 || byteLength > RAW_YAML_PREVIEW_LIMIT,
  };
}

export function buildWorkspacePackageSummary(
  data: ExportData,
  yamlContent: string
): WorkspacePackageSummary {
  const customAbis = getSafeCustomAbisFromExportData(data);
  const abiRows = customAbis.map((customAbi) => {
    const parsed = parseCustomAbiSource(customAbi.source);

    return {
      label: customAbi.label,
      enabled: customAbi.enabled,
      functionCount: parsed.ok ? parsed.functionCount : 0,
      parseStatus: parsed.ok ? "valid" : "invalid",
      parseError: parsed.ok ? null : parsed.error,
      sourceBytes: getStringByteLength(customAbi.source),
    } satisfies WorkspacePackageAbiRow;
  });

  return {
    counts: {
      chains: data.chains?.length ?? 0,
      vaults: data.multisigs?.length ?? 0,
      labels: data.addressLabels?.length ?? 0,
      safeChains:
        data.chains?.filter((chain) => chain.multisigProvider === "safe")
          .length ?? 0,
      customAbis: customAbis.length,
      enabledCustomAbis: customAbis.filter((customAbi) => customAbi.enabled)
        .length,
      invalidCustomAbis: abiRows.filter((row) => row.parseStatus === "invalid")
        .length,
    },
    yamlBytes: getStringByteLength(yamlContent),
    totalAbiSourceBytes: customAbis.reduce(
      (total, customAbi) => total + getStringByteLength(customAbi.source),
      0
    ),
    abiRows,
  };
}
