export interface ProviderAdapterSettings {
  safeTransactionServiceUrl: string;
  safeSingletonAddress: string;
  safeProxyFactoryAddress: string;
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
