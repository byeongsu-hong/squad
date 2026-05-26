export interface SafeCustomAbiEntry {
  label: string;
  source: string;
  enabled: boolean;
}

export interface ProviderAdapterSettings {
  safeTransactionServiceUrl: string;
  safeSingletonAddress: string;
  safeProxyFactoryAddress: string;
  safeCustomAbis: SafeCustomAbiEntry[];
}

export interface SafeProviderAdapterConfig {
  transactionServiceUrl: string;
  singletonAddress: string;
  proxyFactoryAddress: string;
  customAbis: SafeCustomAbiEntry[];
}

export interface ProviderAdaptersConfig {
  evm?: {
    safe?: SafeProviderAdapterConfig;
  };
}

export const DEFAULT_PROVIDER_ADAPTER_SETTINGS: ProviderAdapterSettings = {
  safeTransactionServiceUrl: "",
  safeSingletonAddress: "",
  safeProxyFactoryAddress: "",
  safeCustomAbis: [],
};

function normalizeSafeCustomAbis(
  value?: SafeCustomAbiEntry[] | null
): SafeCustomAbiEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => ({
    label:
      typeof entry?.label === "string" && entry.label.trim()
        ? entry.label.trim()
        : `Custom ABI ${index + 1}`,
    source: typeof entry?.source === "string" ? entry.source : "",
    enabled: entry?.enabled ?? true,
  }));
}

export function normalizeProviderAdapterSettings(
  value?: Partial<ProviderAdapterSettings> | null
): ProviderAdapterSettings {
  return {
    safeTransactionServiceUrl: value?.safeTransactionServiceUrl ?? "",
    safeSingletonAddress: value?.safeSingletonAddress ?? "",
    safeProxyFactoryAddress: value?.safeProxyFactoryAddress ?? "",
    safeCustomAbis: normalizeSafeCustomAbis(value?.safeCustomAbis),
  };
}

export function serializeProviderAdapters(
  settings?: Partial<ProviderAdapterSettings> | null
): ProviderAdaptersConfig | undefined {
  if (!settings) {
    return undefined;
  }

  const normalized = normalizeProviderAdapterSettings(settings);
  const customAbis = normalized.safeCustomAbis.filter(
    (customAbi) => customAbi.source.trim().length > 0
  );
  const hasSafeSettings =
    Boolean(normalized.safeTransactionServiceUrl) ||
    Boolean(normalized.safeSingletonAddress) ||
    Boolean(normalized.safeProxyFactoryAddress) ||
    customAbis.length > 0;

  if (!hasSafeSettings) {
    return undefined;
  }

  return {
    evm: {
      safe: {
        transactionServiceUrl: normalized.safeTransactionServiceUrl,
        singletonAddress: normalized.safeSingletonAddress,
        proxyFactoryAddress: normalized.safeProxyFactoryAddress,
        customAbis,
      },
    },
  };
}

export function normalizeProviderAdapters(
  value?: ProviderAdaptersConfig | null
): ProviderAdaptersConfig | undefined {
  if (!value?.evm?.safe) {
    return undefined;
  }

  return {
    evm: {
      safe: {
        transactionServiceUrl: value.evm.safe.transactionServiceUrl ?? "",
        singletonAddress: value.evm.safe.singletonAddress ?? "",
        proxyFactoryAddress: value.evm.safe.proxyFactoryAddress ?? "",
        customAbis: normalizeSafeCustomAbis(value.evm.safe.customAbis),
      },
    },
  };
}

export function providerAdaptersToSettings(
  value?: ProviderAdaptersConfig | null
): ProviderAdapterSettings {
  const safe = normalizeProviderAdapters(value)?.evm?.safe;

  return normalizeProviderAdapterSettings({
    safeTransactionServiceUrl: safe?.transactionServiceUrl,
    safeSingletonAddress: safe?.singletonAddress,
    safeProxyFactoryAddress: safe?.proxyFactoryAddress,
    safeCustomAbis: safe?.customAbis,
  });
}
