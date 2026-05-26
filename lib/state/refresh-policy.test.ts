import { describe, expect, it } from "vitest";

import {
  getRefreshPlan,
  payloadQueryKey,
  proposalActionSucceededEvent,
  vaultRefreshTarget,
} from "@/lib/state/refresh-policy";

describe("refresh policy", () => {
  const vault = vaultRefreshTarget({
    provider: "safe",
    chainId: "ethereum-mainnet",
    address: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
  });

  it("does not refetch proposals when the connected wallet changes", () => {
    const plan = getRefreshPlan({
      type: "walletChanged",
      address: "0xa7ECcdb9Be08178f896c26b7BbD8C3D4E844d9Ba",
    });

    expect(plan.invalidateQueries).toEqual([]);
    expect(plan.removeQueries).toEqual([]);
  });

  it("refreshes only the imported vault proposal query", () => {
    const plan = getRefreshPlan({
      type: "vaultImported",
      target: vault,
    });

    expect(plan.invalidateQueries).toEqual([
      {
        queryKey: [
          "proposals",
          "safe",
          "ethereum-mainnet",
          "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
        ],
        exact: true,
      },
    ]);
    expect(plan.removeQueries).toEqual([]);
  });

  it("removes only the deleted vault projection and payload query family", () => {
    const plan = getRefreshPlan({
      type: "vaultDeleted",
      target: vault,
    });

    expect(plan.invalidateQueries).toEqual([]);
    expect(plan.removeQueries).toEqual([
      {
        queryKey: [
          "proposals",
          "safe",
          "ethereum-mainnet",
          "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
        ],
        exact: true,
      },
      {
        queryKey: [
          "payload",
          "safe",
          "ethereum-mainnet",
          "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
        ],
        exact: false,
      },
    ]);
  });

  it("removes query families when a chain is deleted", () => {
    const plan = getRefreshPlan({
      type: "chainDeleted",
      chainId: "base-mainnet",
    });

    expect(plan.invalidateQueries).toEqual([]);
    expect(plan.removeQueries).toEqual([
      {
        queryKey: ["proposals", "squads", "base-mainnet"],
        exact: false,
      },
      {
        queryKey: ["proposals", "safe", "base-mainnet"],
        exact: false,
      },
      {
        queryKey: ["payload", "squads", "base-mainnet"],
        exact: false,
      },
      {
        queryKey: ["payload", "safe", "base-mainnet"],
        exact: false,
      },
    ]);
  });

  it("invalidates only the affected proposal vault and nonce payload after an action", () => {
    const plan = getRefreshPlan(
      proposalActionSucceededEvent({
        target: vault,
        nonce: 32n,
      })
    );

    expect(plan.invalidateQueries).toEqual([
      {
        queryKey: [
          "proposals",
          "safe",
          "ethereum-mainnet",
          "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
        ],
        exact: true,
      },
      {
        queryKey: payloadQueryKey({
          provider: "safe",
          chainId: "ethereum-mainnet",
          address: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
          nonce: 32n,
        }),
        exact: true,
      },
    ]);
  });

  it("keeps ABI settings changes local to payload decode", () => {
    const plan = getRefreshPlan({
      type: "settingsChanged",
      setting: "safeCustomAbi",
    });

    expect(plan.invalidateQueries).toEqual([]);
    expect(plan.localEffects).toEqual(["payloadDecode"]);
  });
});
