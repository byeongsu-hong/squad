import { useEffect, useMemo, useRef } from "react";

import { usePagination } from "@/lib/hooks/use-pagination";

interface UseFocusedQueueOptions<T> {
  items: T[];
  filter: "all" | "waiting" | "executable";
  itemsPerPage: number;
  focusedKey: string | null;
  setFocusedKey: (key: string | null) => void;
  getItemKey: (item: T) => string;
  isWaiting: (item: T) => boolean;
  isExecutable: (item: T) => boolean;
}

export function useFocusedQueue<T>({
  items,
  filter,
  itemsPerPage,
  focusedKey,
  setFocusedKey,
  getItemKey,
  isWaiting,
  isExecutable,
}: UseFocusedQueueOptions<T>) {
  const lastSyncedFocusedKeyRef = useRef<string | null>(null);
  const filteredItems = useMemo(() => {
    if (filter === "waiting") {
      return items.filter(isWaiting);
    }

    if (filter === "executable") {
      return items.filter(isExecutable);
    }

    return items;
  }, [filter, isExecutable, isWaiting, items]);
  const filteredItemKeys = useMemo(
    () => new Set(filteredItems.map(getItemKey)),
    [filteredItems, getItemKey]
  );

  const pagination = usePagination(filteredItems, {
    totalItems: filteredItems.length,
    itemsPerPage,
  });

  useEffect(() => {
    if (filteredItems.length === 0) {
      lastSyncedFocusedKeyRef.current = null;
      return;
    }

    if (focusedKey && filteredItemKeys.has(focusedKey)) {
      return;
    }

    setFocusedKey(filteredItems[0] ? getItemKey(filteredItems[0]) : null);
  }, [filteredItemKeys, filteredItems, focusedKey, getItemKey, setFocusedKey]);

  useEffect(() => {
    if (!focusedKey) {
      lastSyncedFocusedKeyRef.current = null;
      return;
    }

    if (lastSyncedFocusedKeyRef.current === focusedKey) {
      return;
    }

    const focusedIndex = filteredItems.findIndex(
      (item) => getItemKey(item) === focusedKey
    );

    if (focusedIndex === -1) {
      return;
    }

    pagination.goToPage(Math.floor(focusedIndex / itemsPerPage) + 1);
    lastSyncedFocusedKeyRef.current = focusedKey;
  }, [filteredItems, focusedKey, getItemKey, itemsPerPage, pagination]);

  const focusedItem =
    filteredItems.find((item) => getItemKey(item) === focusedKey) ??
    filteredItems[0] ??
    items[0] ??
    null;

  return {
    filteredItems,
    focusedItem,
    pagination,
  };
}
