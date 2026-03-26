import { useEffect, useMemo } from "react";

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
  const filteredItems = useMemo(() => {
    if (filter === "waiting") {
      return items.filter(isWaiting);
    }

    if (filter === "executable") {
      return items.filter(isExecutable);
    }

    return items;
  }, [filter, isExecutable, isWaiting, items]);

  const pagination = usePagination(filteredItems, {
    totalItems: filteredItems.length,
    itemsPerPage,
  });

  useEffect(() => {
    const availableKeys = new Set(items.map(getItemKey));
    if (focusedKey && availableKeys.has(focusedKey)) {
      return;
    }

    setFocusedKey(filteredItems[0] ? getItemKey(filteredItems[0]) : null);
  }, [filteredItems, focusedKey, getItemKey, items, setFocusedKey]);

  useEffect(() => {
    if (!focusedKey) {
      return;
    }

    const focusedIndex = filteredItems.findIndex(
      (item) => getItemKey(item) === focusedKey
    );

    if (focusedIndex === -1) {
      return;
    }

    pagination.goToPage(Math.floor(focusedIndex / itemsPerPage) + 1);
  }, [filteredItems, focusedKey, getItemKey, itemsPerPage, pagination]);

  const focusedItem =
    items.find((item) => getItemKey(item) === focusedKey) ?? items[0] ?? null;

  return {
    filteredItems,
    focusedItem,
    pagination,
  };
}
