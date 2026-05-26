"use client";

import { useMemo, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const { subscribe, getSnapshot } = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        subscribe: (_: () => void) => () => {},
        getSnapshot: () => false,
      };
    }
    const mql = window.matchMedia(query);
    return {
      subscribe: (callback: () => void) => {
        mql.addEventListener("change", callback);
        return () => mql.removeEventListener("change", callback);
      },
      getSnapshot: () => mql.matches,
    };
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
