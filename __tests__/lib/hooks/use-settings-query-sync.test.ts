import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSettingsQuerySync } from "@/lib/hooks/use-settings-query-sync";
import type { WorkspaceSettingsSection } from "@/types/workspace";

describe("useSettingsQuerySync", () => {
  it("hydrates the initial settings section and writes later changes back to the query", async () => {
    const searchParams = new URLSearchParams("section=registry");
    const state = {
      activeSection: "chains" as WorkspaceSettingsSection,
    };

    const setActiveSection = vi.fn((next: WorkspaceSettingsSection) => {
      state.activeSection = next;
    });
    const replace = vi.fn();

    const { rerender } = renderHook(() =>
      useSettingsQuerySync({
        searchParams,
        pathname: "/settings",
        replace,
        activeSection: state.activeSection,
        setActiveSection,
      })
    );

    await waitFor(() => {
      expect(setActiveSection).toHaveBeenCalledWith("registry");
    });

    expect(replace).not.toHaveBeenCalled();

    state.activeSection = "labels";
    rerender();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/settings?section=labels");
    });
  });
});
