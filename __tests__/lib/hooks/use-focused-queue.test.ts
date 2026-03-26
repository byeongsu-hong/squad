import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFocusedQueue } from "@/lib/hooks/use-focused-queue";

describe("useFocusedQueue", () => {
  it("falls back to the first filtered item when the focused item is no longer visible", async () => {
    const items = [
      { id: "alpha", waiting: true, executable: false },
      { id: "beta", waiting: false, executable: true },
      { id: "gamma", waiting: true, executable: false },
    ];

    let focusedKey: string | null = "beta";
    const setFocusedKey = vi.fn((next: string | null) => {
      focusedKey = next;
    });

    const { result, rerender } = renderHook(() =>
      useFocusedQueue({
        items,
        filter: "waiting",
        itemsPerPage: 2,
        focusedKey,
        setFocusedKey,
        getItemKey: (item) => item.id,
        isWaiting: (item) => item.waiting,
        isExecutable: (item) => item.executable,
      })
    );

    await waitFor(() => {
      expect(setFocusedKey).toHaveBeenCalledWith("alpha");
    });

    rerender();

    expect(result.current.filteredItems.map((item) => item.id)).toEqual([
      "alpha",
      "gamma",
    ]);
    expect(result.current.focusedItem?.id).toBe("alpha");
  });
});
