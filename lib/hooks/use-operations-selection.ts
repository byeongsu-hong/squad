interface UseOperationsSelectionOptions {
  setActiveViewKey: (key: string) => void;
  setFocusedProposalKey: (key: string | null) => void;
  setSelectedRegistryKeys: (
    keys: string[] | ((current: string[]) => string[])
  ) => void;
  setExpandedViewKeys: (
    keys: string[] | ((current: string[]) => string[])
  ) => void;
}

export function useOperationsSelection({
  setActiveViewKey,
  setFocusedProposalKey,
  setSelectedRegistryKeys,
  setExpandedViewKeys,
}: UseOperationsSelectionOptions) {
  const handleViewSelect = (viewId: string) => {
    setActiveViewKey(viewId);
    setSelectedRegistryKeys([]);
    setFocusedProposalKey(null);
  };

  const handleRegistrySelect = (
    multisigKey: string,
    event?: Pick<MouseEvent, "metaKey" | "ctrlKey">
  ) => {
    const multiselect = Boolean(event?.metaKey || event?.ctrlKey);
    setFocusedProposalKey(null);

    setSelectedRegistryKeys((current) => {
      if (!multiselect) {
        return [multisigKey];
      }

      if (current.includes(multisigKey)) {
        return current.filter((key) => key !== multisigKey);
      }

      return [...current, multisigKey];
    });
  };

  const toggleViewExpansion = (viewId: string) => {
    setExpandedViewKeys((current) =>
      current.includes(viewId)
        ? current.filter((id) => id !== viewId)
        : [...current, viewId]
    );
  };

  return {
    handleViewSelect,
    handleRegistrySelect,
    toggleViewExpansion,
  };
}
