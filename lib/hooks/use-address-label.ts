import { useEffect } from "react";

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
    addLabel,
    updateLabel,
    deleteLabel,
  } = useAddressLabelStore();

  useEffect(() => {
    if (!initialized) {
      initializeLabels();
    }
  }, [initialized, initializeLabels]);

  const sortedLabels = Array.from(labels.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return {
    labels: sortedLabels,
    addLabel,
    updateLabel,
    deleteLabel,
    initialized,
  };
}
