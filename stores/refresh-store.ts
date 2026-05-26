import { create } from "zustand";

interface RefreshStatus {
  lastRefreshAt: number | null;
  refreshing: boolean;
  degradedReason: string | null;
  stale: boolean;
}

interface RefreshScope {
  provider?: string;
  chainId: string;
  address?: string;
}

interface RefreshStore {
  chains: Record<string, RefreshStatus>;
  vaults: Record<string, RefreshStatus>;
  startRefresh: (scope: RefreshScope) => void;
  finishRefresh: (scope: RefreshScope, at?: number) => void;
  markDegraded: (scope: RefreshScope, reason: string) => void;
  markStale: (scope: RefreshScope, stale?: boolean) => void;
  clearDegraded: (scope: RefreshScope) => void;
}

function initialStatus(): RefreshStatus {
  return {
    lastRefreshAt: null,
    refreshing: false,
    degradedReason: null,
    stale: false,
  };
}

function vaultKey(scope: RefreshScope) {
  return scope.provider && scope.address
    ? `${scope.provider}:${scope.chainId}:${scope.address}`
    : null;
}

function updateStatus(
  status: RefreshStatus | undefined,
  updates: Partial<RefreshStatus>
) {
  return {
    ...(status ?? initialStatus()),
    ...updates,
  };
}

export const useRefreshStore = create<RefreshStore>((set) => ({
  chains: {},
  vaults: {},

  startRefresh: (scope) =>
    set((state) => {
      const key = vaultKey(scope);
      if (key) {
        return {
          vaults: {
            ...state.vaults,
            [key]: updateStatus(state.vaults[key], { refreshing: true }),
          },
        };
      }

      return {
        chains: {
          ...state.chains,
          [scope.chainId]: updateStatus(state.chains[scope.chainId], {
            refreshing: true,
          }),
        },
      };
    }),

  finishRefresh: (scope, at = Date.now()) =>
    set((state) => {
      const key = vaultKey(scope);
      if (key) {
        return {
          vaults: {
            ...state.vaults,
            [key]: updateStatus(state.vaults[key], {
              lastRefreshAt: at,
              refreshing: false,
              stale: false,
            }),
          },
        };
      }

      return {
        chains: {
          ...state.chains,
          [scope.chainId]: updateStatus(state.chains[scope.chainId], {
            lastRefreshAt: at,
            refreshing: false,
            stale: false,
          }),
        },
      };
    }),

  markDegraded: (scope, reason) =>
    set((state) => {
      const key = vaultKey(scope);
      if (key) {
        return {
          vaults: {
            ...state.vaults,
            [key]: updateStatus(state.vaults[key], {
              degradedReason: reason,
              refreshing: false,
            }),
          },
        };
      }

      return {
        chains: {
          ...state.chains,
          [scope.chainId]: updateStatus(state.chains[scope.chainId], {
            degradedReason: reason,
            refreshing: false,
          }),
        },
      };
    }),

  markStale: (scope, stale = true) =>
    set((state) => {
      const key = vaultKey(scope);
      if (key) {
        return {
          vaults: {
            ...state.vaults,
            [key]: updateStatus(state.vaults[key], { stale }),
          },
        };
      }

      return {
        chains: {
          ...state.chains,
          [scope.chainId]: updateStatus(state.chains[scope.chainId], {
            stale,
          }),
        },
      };
    }),

  clearDegraded: (scope) =>
    set((state) => {
      const key = vaultKey(scope);
      if (key) {
        return {
          vaults: {
            ...state.vaults,
            [key]: updateStatus(state.vaults[key], {
              degradedReason: null,
              stale: false,
            }),
          },
        };
      }

      return {
        chains: {
          ...state.chains,
          [scope.chainId]: updateStatus(state.chains[scope.chainId], {
            degradedReason: null,
            stale: false,
          }),
        },
      };
    }),
}));
