import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useOperationsSelection } from "@/lib/hooks/use-operations-selection";

describe("useOperationsSelection", () => {
  it("clears stale focused proposal when a registry row is selected", () => {
    const setActiveViewKey = vi.fn();
    const setFocusedProposalKey = vi.fn();
    const setSelectedRegistryKeys = vi.fn();
    const setExpandedViewKeys = vi.fn();

    const { result } = renderHook(() =>
      useOperationsSelection({
        setActiveViewKey,
        setFocusedProposalKey,
        setSelectedRegistryKeys,
        setExpandedViewKeys,
      })
    );

    act(() => {
      result.current.handleRegistrySelect("alpha");
    });

    expect(setFocusedProposalKey).toHaveBeenCalledWith(null);
    expect(setSelectedRegistryKeys).toHaveBeenCalledTimes(1);

    const updater = setSelectedRegistryKeys.mock.calls[0][0] as (
      current: string[]
    ) => string[];
    expect(updater([])).toEqual(["alpha"]);
  });
});
