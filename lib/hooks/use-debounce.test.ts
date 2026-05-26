import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";

import { useDebounce } from "@/lib/hooks/use-debounce";

describe("useDebounce", () => {
  it("should return initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("test", 500));
    expect(result.current).toBe("test");
  });

  it("should debounce value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: "initial", delay: 300 },
      }
    );

    expect(result.current).toBe("initial");

    // Change value
    rerender({ value: "updated", delay: 300 });

    // Should still have old value immediately
    expect(result.current).toBe("initial");

    // Wait for debounce
    await waitFor(
      () => {
        expect(result.current).toBe("updated");
      },
      { timeout: 400 }
    );
  });

  it("should cancel previous timeout on rapid changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      {
        initialProps: { value: "first" },
      }
    );

    expect(result.current).toBe("first");

    // Rapid changes
    act(() => {
      rerender({ value: "second" });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    act(() => {
      rerender({ value: "third" });
    });

    // Should still be first
    expect(result.current).toBe("first");

    // Wait for final debounce
    await waitFor(
      () => {
        expect(result.current).toBe("third");
      },
      { timeout: 300 }
    );
  });

  it("should handle custom delay", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      {
        initialProps: { value: "test" },
      }
    );

    rerender({ value: "updated" });

    await waitFor(
      () => {
        expect(result.current).toBe("updated");
      },
      { timeout: 200 }
    );
  });
});
