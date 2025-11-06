import { useEffect, useState } from "react";

import { UI_CONFIG } from "@/lib/config";

/**
 * Hook that debounces a value
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (defaults to UI_CONFIG.DEBOUNCE_DELAY)
 * @returns The debounced value
 */
export function useDebounce<T>(
  value: T,
  delay: number = UI_CONFIG.DEBOUNCE_DELAY
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
