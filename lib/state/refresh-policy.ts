import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { WorkspaceProviderId } from "@/types/workspace";

export type RefreshDomain =
  | "registry"
  | "wallet"
  | "proposals"
  | "payload"
  | "health"
  | "projection";

export interface VaultRefreshTarget {
  provider: WorkspaceProviderId;
  chainId: string;
  address: string;
}

export type RefreshLocalEffect =
  | "projection"
  | "payloadDecode"
  | "registry"
  | "health";

interface QueryRefreshOperation {
  queryKey: QueryKey;
  exact: boolean;
}

export interface RefreshPlan {
  invalidateQueries: QueryRefreshOperation[];
  removeQueries: QueryRefreshOperation[];
  localEffects: RefreshLocalEffect[];
}

export type RefreshEvent =
  | {
      type: "chainUpdated";
      chainId: string;
    }
  | {
      type: "chainDeleted";
      chainId: string;
    }
  | {
      type: "vaultImported";
      target: VaultRefreshTarget;
    }
  | {
      type: "vaultDeleted";
      target: VaultRefreshTarget;
    }
  | {
      type: "walletChanged";
      address: string | null;
    }
  | {
      type: "proposalActionSucceeded";
      target: VaultRefreshTarget;
      nonce: bigint | string | number;
    }
  | {
      type: "manualRefresh";
      target?: VaultRefreshTarget;
      chainId?: string;
      provider?: WorkspaceProviderId;
    }
  | {
      type: "settingsChanged";
      setting: "safeCustomAbi" | "rpc" | "labels" | "registry";
    };

const EMPTY_PLAN: RefreshPlan = {
  invalidateQueries: [],
  removeQueries: [],
  localEffects: [],
};

export function vaultRefreshTarget(
  target: VaultRefreshTarget
): VaultRefreshTarget {
  return target;
}

export function proposalActionSucceededEvent(params: {
  target: VaultRefreshTarget;
  nonce: bigint | string | number;
}): RefreshEvent {
  return {
    type: "proposalActionSucceeded",
    target: params.target,
    nonce: params.nonce,
  };
}

export function proposalQueryKey(
  provider: WorkspaceProviderId,
  chainId: string,
  multisigAddress: string
) {
  return ["proposals", provider, chainId, multisigAddress] as const;
}

export function proposalQueryKeyForTarget(target: VaultRefreshTarget) {
  return proposalQueryKey(target.provider, target.chainId, target.address);
}

export function payloadQueryKey(
  target: VaultRefreshTarget & {
    nonce: bigint | string | number;
  }
) {
  return [
    "payload",
    target.provider,
    target.chainId,
    target.address,
    target.nonce.toString(),
  ] as const;
}

export function payloadQueryFamilyKey(target: VaultRefreshTarget) {
  return ["payload", target.provider, target.chainId, target.address] as const;
}

function invalidateVaultProposals(target: VaultRefreshTarget) {
  return {
    queryKey: proposalQueryKeyForTarget(target),
    exact: true,
  };
}

function invalidateVaultPayloadNonce(
  target: VaultRefreshTarget,
  nonce: bigint | string | number
) {
  return {
    queryKey: payloadQueryKey({ ...target, nonce }),
    exact: true,
  };
}

export function getRefreshPlan(event: RefreshEvent): RefreshPlan {
  switch (event.type) {
    case "walletChanged":
      return EMPTY_PLAN;

    case "vaultImported":
      return {
        invalidateQueries: [invalidateVaultProposals(event.target)],
        removeQueries: [],
        localEffects: ["projection"],
      };

    case "vaultDeleted":
      return {
        invalidateQueries: [],
        removeQueries: [
          invalidateVaultProposals(event.target),
          {
            queryKey: payloadQueryFamilyKey(event.target),
            exact: false,
          },
        ],
        localEffects: ["projection"],
      };

    case "proposalActionSucceeded":
      return {
        invalidateQueries: [
          invalidateVaultProposals(event.target),
          invalidateVaultPayloadNonce(event.target, event.nonce),
        ],
        removeQueries: [],
        localEffects: ["projection"],
      };

    case "manualRefresh":
      if (event.target) {
        return {
          invalidateQueries: [invalidateVaultProposals(event.target)],
          removeQueries: [],
          localEffects: ["projection"],
        };
      }
      if (event.chainId && event.provider) {
        return {
          invalidateQueries: [
            {
              queryKey: ["proposals", event.provider, event.chainId],
              exact: false,
            },
          ],
          removeQueries: [],
          localEffects: ["projection"],
        };
      }
      return EMPTY_PLAN;

    case "chainUpdated":
      return {
        invalidateQueries: [
          {
            queryKey: ["proposals", "squads", event.chainId],
            exact: false,
          },
          {
            queryKey: ["proposals", "safe", event.chainId],
            exact: false,
          },
        ],
        removeQueries: [],
        localEffects: ["registry", "health", "projection"],
      };

    case "chainDeleted":
      return {
        invalidateQueries: [],
        removeQueries: [
          {
            queryKey: ["proposals", "squads", event.chainId],
            exact: false,
          },
          {
            queryKey: ["proposals", "safe", event.chainId],
            exact: false,
          },
          {
            queryKey: ["payload", "squads", event.chainId],
            exact: false,
          },
          {
            queryKey: ["payload", "safe", event.chainId],
            exact: false,
          },
        ],
        localEffects: ["registry", "health", "projection"],
      };

    case "settingsChanged":
      if (event.setting === "safeCustomAbi") {
        return {
          invalidateQueries: [],
          removeQueries: [],
          localEffects: ["payloadDecode"],
        };
      }
      if (event.setting === "labels") {
        return {
          invalidateQueries: [],
          removeQueries: [],
          localEffects: ["projection"],
        };
      }
      return {
        invalidateQueries: [],
        removeQueries: [],
        localEffects: ["registry"],
      };
  }
}

export function applyRefreshPlan(queryClient: QueryClient, plan: RefreshPlan) {
  for (const operation of plan.removeQueries) {
    queryClient.removeQueries(operation);
  }

  for (const operation of plan.invalidateQueries) {
    void queryClient.invalidateQueries(operation);
  }
}
