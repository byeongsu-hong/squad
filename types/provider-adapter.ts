export interface ProviderAdapterSettings {
  safeTransactionServiceUrl: string;
  safeSingletonAddress: string;
  safeProxyFactoryAddress: string;
}

export interface SafeProviderAdapterConfig {
  transactionServiceUrl: string;
  singletonAddress: string;
  proxyFactoryAddress: string;
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
};

export function normalizeProviderAdapterSettings(
  value?: Partial<ProviderAdapterSettings> | null
): ProviderAdapterSettings {
  return {
    safeTransactionServiceUrl: value?.safeTransactionServiceUrl ?? "",
    safeSingletonAddress: value?.safeSingletonAddress ?? "",
    safeProxyFactoryAddress: value?.safeProxyFactoryAddress ?? "",
  };
}

export function serializeProviderAdapters(
  settings?: Partial<ProviderAdapterSettings> | null
): ProviderAdaptersConfig | undefined {
  if (!settings) {
    return undefined;
  }

  const normalized = normalizeProviderAdapterSettings(settings);
  const hasSafeSettings = Object.values(normalized).some(Boolean);

  if (!hasSafeSettings) {
    return undefined;
  }

  return {
    evm: {
      safe: {
        transactionServiceUrl: normalized.safeTransactionServiceUrl,
        singletonAddress: normalized.safeSingletonAddress,
        proxyFactoryAddress: normalized.safeProxyFactoryAddress,
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
  });
}
