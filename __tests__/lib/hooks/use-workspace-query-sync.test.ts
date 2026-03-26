import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  useOperationsWorkspaceQuerySync,
  useProposalDeskQuerySync,
} from "@/lib/hooks/use-workspace-query-sync";

describe("useOperationsWorkspaceQuerySync", () => {
  it("hydrates dashboard query state and writes back later state changes", async () => {
    const searchParams = new URLSearchParams(
      "multisigs=alpha,beta&view=attention&filter=waiting&proposal=alpha-7"
    );
    const state = {
      queueFilter: "all" as "all" | "waiting" | "executable",
      focusedProposalKey: null as string | null,
      selectedRegistryKeys: [] as string[],
      activeViewKey: "all",
    };

    const setQueueFilter = vi.fn((next: "all" | "waiting" | "executable") => {
      state.queueFilter = next;
    });
    const setFocusedProposalKey = vi.fn((next: string | null) => {
      state.focusedProposalKey = next;
    });
    const setSelectedRegistryKeys = vi.fn(
      (next: string[] | ((current: string[]) => string[])) => {
        state.selectedRegistryKeys =
          typeof next === "function" ? next(state.selectedRegistryKeys) : next;
      }
    );
    const setActiveViewKey = vi.fn((next: string) => {
      state.activeViewKey = next;
    });
    const replace = vi.fn();

    const { rerender } = renderHook(() =>
      useOperationsWorkspaceQuerySync({
        searchParams,
        pathname: "/dashboard",
        replace,
        availableMultisigKeys: ["alpha", "beta"],
        queueFilter: state.queueFilter,
        focusedProposalKey: state.focusedProposalKey,
        selectedRegistryKeys: state.selectedRegistryKeys,
        activeViewKey: state.activeViewKey,
        setQueueFilter,
        setFocusedProposalKey,
        setSelectedRegistryKeys,
        setActiveViewKey,
      })
    );

    await waitFor(() => {
      expect(setQueueFilter).toHaveBeenCalledWith("waiting");
      expect(setFocusedProposalKey).toHaveBeenCalledWith("alpha-7");
      expect(setActiveViewKey).toHaveBeenCalledWith("attention");
    });

    expect(replace).not.toHaveBeenCalled();

    state.queueFilter = "executable";
    rerender();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/dashboard?multisigs=alpha%2Cbeta&view=attention&filter=executable&proposal=alpha-7"
      );
    });
  });
});

describe("useProposalDeskQuerySync", () => {
  it("hydrates signing desk query state and writes back later state changes", async () => {
    const searchParams = new URLSearchParams(
      "multisig=alpha&filter=waiting&proposal=alpha-7"
    );
    const state = {
      selectedMultisigKey: null as string | null,
      queueFilter: "all" as "all" | "waiting" | "executable",
      focusedProposalKey: null as string | null,
    };

    const selectMultisig = vi.fn((next: string | null) => {
      state.selectedMultisigKey = next;
    });
    const setQueueFilter = vi.fn((next: "all" | "waiting" | "executable") => {
      state.queueFilter = next;
    });
    const setFocusedProposalKey = vi.fn((next: string | null) => {
      state.focusedProposalKey = next;
    });
    const replace = vi.fn();

    const { rerender } = renderHook(() =>
      useProposalDeskQuerySync({
        searchParams,
        pathname: "/proposals",
        replace,
        availableMultisigKeys: ["alpha", "beta"],
        selectedMultisigKey: state.selectedMultisigKey,
        queueFilter: state.queueFilter,
        focusedProposalKey: state.focusedProposalKey,
        selectMultisig,
        setQueueFilter,
        setFocusedProposalKey,
      })
    );

    await waitFor(() => {
      expect(selectMultisig).toHaveBeenCalledWith("alpha");
      expect(setQueueFilter).toHaveBeenCalledWith("waiting");
      expect(setFocusedProposalKey).toHaveBeenCalledWith("alpha-7");
    });

    expect(replace).not.toHaveBeenCalled();

    state.queueFilter = "executable";
    rerender();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/proposals?multisig=alpha&filter=executable&proposal=alpha-7"
      );
    });
  });
});
