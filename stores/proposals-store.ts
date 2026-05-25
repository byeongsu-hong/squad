import { create } from "zustand";

import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

interface ProposalsStore {
  proposals: WorkspaceProposal[];
  loading: boolean;
  workspaceMultisigs: WorkspaceMultisig[];
  setData: (
    proposals: WorkspaceProposal[],
    workspaceMultisigs: WorkspaceMultisig[]
  ) => void;
  setLoading: (loading: boolean) => void;
}

export const useProposalsStore = create<ProposalsStore>((set) => ({
  proposals: [],
  loading: true,
  workspaceMultisigs: [],
  setData: (proposals, workspaceMultisigs) =>
    set({ proposals, workspaceMultisigs }),
  setLoading: (loading) => set({ loading }),
}));
