import { useEffect, useMemo } from "react";

import { useAddressLabelStore } from "@/stores/address-label-store";

export function useAddressLabel(address?: string) {
  const { initialized, initializeLabels, getLabel } = useAddressLabelStore();

  useEffect(() => {
    if (!initialized) {
      initializeLabels();
    }
  }, [initialized, initializeLabels]);

  if (!address) {
    return null;
  }

  return getLabel(address) || null;
}

export function useAddressLabels() {
  const {
    labels,
    initialized,
    initializeLabels,
    upsertLabels,
    addLabel,
    updateLabel,
    deleteLabel,
  } = useAddressLabelStore();

  useEffect(() => {
    if (!initialized) {
      initializeLabels();
    }
  }, [initialized, initializeLabels]);

  const sortedLabels = useMemo(
    () => Array.from(labels.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    [labels]
  );

  return {
    labels: sortedLabels,
    upsertLabels,
    addLabel,
    updateLabel,
    deleteLabel,
    initialized,
  };
}
