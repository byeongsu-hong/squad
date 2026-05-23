import { PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";
import bs58 from "bs58";

import { SquadService } from "@/lib/squad";
import { mapWithConcurrency } from "@/lib/utils/async";
import {
  toWorkspaceMultisig,
  toWorkspaceMultisigs,
} from "@/lib/workspace/multisig-conversion";
import type {
  WorkspacePayloadLoaderOptions,
  WorkspaceProviderAdapter,
} from "@/lib/workspace/provider-contract";
import {
  type ChainConfig,
  getSquadsProgramId,
  isOperationalSquadsChain,
} from "@/types/chain";
import {
  type MultisigAccount,
  type ProposalAccount,
  isSquadsMultisig,
} from "@/types/multisig";
import { toProposalStatus } from "@/types/multisig";
import type {
  WorkspaceMultisig,
  WorkspacePayload,
  WorkspaceProposal,
  WorkspaceQueueItem,
} from "@/types/workspace";
import { getWorkspaceMultisigKey } from "@/types/workspace";

function getChainConfig(chains: ChainConfig[], chainId: string) {
  return chains.find((chain) => chain.id === chainId);
}

function getOperationalSquadsChain(chains: ChainConfig[], chainId: string) {
  const chain = getChainConfig(chains, chainId);
  if (!chain || !isOperationalSquadsChain(chain)) {
    return null;
  }

  return chain;
}

const SQUADS_MULTISIG_LOAD_CONCURRENCY = 3;
const SQUADS_PROPOSAL_ENRICH_CONCURRENCY = 8;

export async function loadSquadsWorkspaceProposals(
  multisigs: MultisigAccount[],
  chains: ChainConfig[]
): Promise<WorkspaceProposal[]> {
  const groupedResults = await mapWithConcurrency(
    multisigs,
    SQUADS_MULTISIG_LOAD_CONCURRENCY,
    async (multisig) => {
      if (!isSquadsMultisig(multisig)) {
        return [];
      }

      const chain = getOperationalSquadsChain(chains, multisig.chainId);
      if (!chain) {
        return [];
      }

      const squadService = new SquadService(
        chain.rpcUrl,
        getSquadsProgramId(chain)
      );
      const proposalAccounts = await squadService.getProposalsByMultisig(
        multisig.publicKey
      );

      return mapWithConcurrency(
        proposalAccounts,
        SQUADS_PROPOSAL_ENRICH_CONCURRENCY,
        (account) =>
          toWorkspaceProposal(
            account.account.multisig,
            account,
            chain,
            squadService
          )
      );
    }
  );

  return groupedResults
    .flat()
    .filter((proposal): proposal is WorkspaceProposal => proposal !== null)
    .sort((left, right) =>
      Number(right.transactionIndex - left.transactionIndex)
    );
}

export async function loadSquadsCreatorMultisigs(
  chainId: string,
  creatorAddress: string,
  chains: ChainConfig[],
  existingMultisigs: MultisigAccount[] = []
): Promise<MultisigAccount[]> {
  const chain = getOperationalSquadsChain(chains, chainId);
  if (!chain) {
    return [];
  }

  const programIdString = getSquadsProgramId(chain);
  const squadService = new SquadService(chain.rpcUrl, programIdString);
  const accounts = await squadService.getMultisigsByCreator(
    new PublicKey(creatorAddress)
  );
  const existingByKey = new Map(
    existingMultisigs.map((multisig) => [
      multisig.publicKey.toString(),
      multisig,
    ])
  );

  return accounts.map((account) => {
    const existing = existingByKey.get(account.publicKey.toString());

    return {
      provider: "squads",
      publicKey: account.publicKey,
      threshold: account.account.threshold,
      members: account.account.members.map((member) => ({
        key: member.key,
        permissions: { mask: member.permissions.mask },
      })),
      transactionIndex: BigInt(account.account.transactionIndex.toString()),
      msChangeIndex: existing?.msChangeIndex ?? 0,
      programId: new PublicKey(programIdString),
      chainId: chain.id,
      label: existing?.label,
      tags: existing?.tags,
      vaultPda: existing?.vaultPda,
    } satisfies MultisigAccount;
  });
}

export async function loadSquadsWorkspaceProposalsForMultisig(
  multisig: MultisigAccount,
  chains: ChainConfig[]
): Promise<WorkspaceProposal[]> {
  if (!isSquadsMultisig(multisig)) {
    return [];
  }

  const chain = getOperationalSquadsChain(chains, multisig.chainId);
  if (!chain) {
    return [];
  }

  const squadService = new SquadService(
    chain.rpcUrl,
    getSquadsProgramId(chain)
  );
  const proposalAccounts = await squadService.getProposalsByMultisig(
    multisig.publicKey
  );

  const proposals = await mapWithConcurrency(
    proposalAccounts,
    SQUADS_PROPOSAL_ENRICH_CONCURRENCY,
    (account) =>
      toWorkspaceProposal(
        account.account.multisig,
        account,
        chain,
        squadService
      )
  );

  return proposals
    .filter((proposal): proposal is WorkspaceProposal => proposal !== null)
    .sort((left, right) =>
      Number(right.transactionIndex - left.transactionIndex)
    );
}

async function toWorkspaceProposal(
  multisigKey: PublicKey,
  proposalAccount: {
    publicKey: PublicKey;
    account: {
      multisig: PublicKey;
      transactionIndex: bigint | { toString(): string };
      status: { __kind: string };
      approved?: PublicKey[];
      rejected?: PublicKey[];
    };
  },
  chain: ChainConfig,
  squadService: SquadService
): Promise<WorkspaceProposal | null> {
  const status = toProposalStatus(proposalAccount.account.status.__kind);
  const transactionIndex = BigInt(
    proposalAccount.account.transactionIndex.toString()
  );

  let creator: PublicKey | undefined;

  try {
    const txType = await squadService.getTransactionType(
      multisigKey,
      transactionIndex
    );

    if (txType === "vault") {
      const vaultTx = await squadService.getVaultTransaction(
        multisigKey,
        transactionIndex
      );
      creator = vaultTx.creator;
    } else {
      const configTx = await squadService.getConfigTransaction(
        multisigKey,
        transactionIndex
      );
      creator = configTx.creator;
    }
  } catch (error) {
    console.warn(
      `Failed to load creator for proposal ${transactionIndex.toString()} on ${chain.id}:`,
      error
    );
  }

  return {
    provider: "squads",
    multisigKey: getWorkspaceMultisigKey(chain.id, multisigKey.toString()),
    multisigAddress: multisigKey.toString(),
    chainId: chain.id,
    transactionIndex,
    creator: creator?.toString(),
    createdAt: undefined,
    status,
    approvals: (proposalAccount.account.approved ?? []).map((item) =>
      item.toString()
    ),
    rejections: (proposalAccount.account.rejected ?? []).map((item) =>
      item.toString()
    ),
    executed: status === "Executed",
    cancelled: status === "Cancelled",
  };
}

export function buildWorkspaceQueueItem(
  proposal: WorkspaceProposal,
  multisig: WorkspaceMultisig,
  viewerAddress: string | null
): WorkspaceQueueItem {
  const approvalCount = proposal.approvals.length;
  const hasMetThreshold = approvalCount >= multisig.threshold;
  const isMember = Boolean(
    viewerAddress &&
    multisig.members.some((member) => member.address === viewerAddress)
  );
  const currentUserApproved = Boolean(
    viewerAddress && proposal.approvals.includes(viewerAddress)
  );
  const currentUserRejected = Boolean(
    viewerAddress && proposal.rejections.includes(viewerAddress)
  );
  const active = !proposal.executed && !proposal.cancelled;
  const readyToExecute = active && hasMetThreshold;
  const needsYourSignature =
    active && isMember && !currentUserApproved && !currentUserRejected;
  const missingApprovals = Math.max(multisig.threshold - approvalCount, 0);

  let priority = 3;
  let lineLabel = "Completed";

  if (needsYourSignature) {
    priority = 0;
    lineLabel = "Waiting on you";
  } else if (readyToExecute) {
    priority = 1;
    lineLabel = "Ready to execute";
  } else if (proposal.status === "Active") {
    priority = 2;
    lineLabel =
      missingApprovals > 0
        ? `${missingApprovals} signer${missingApprovals === 1 ? "" : "s"} remaining`
        : "In review";
  } else if (proposal.status === "Rejected") {
    lineLabel = "Rejected";
  } else if (proposal.status === "Cancelled") {
    lineLabel = "Cancelled";
  } else if (proposal.status === "Executed") {
    lineLabel = "Executed";
  }

  return {
    focusKey: `${multisig.key}-${proposal.transactionIndex.toString()}`,
    provider: "squads",
    proposal,
    multisig,
    approvalCount,
    currentUserApproved,
    currentUserRejected,
    isMember,
    needsYourSignature,
    readyToExecute,
    missingApprovals,
    priority,
    lineLabel,
  };
}

export function toWorkspaceProposalFromRaw(
  proposal: ProposalAccount,
  chainId: string
): WorkspaceProposal {
  return {
    provider: "squads",
    multisigKey: getWorkspaceMultisigKey(chainId, proposal.multisig.toString()),
    multisigAddress: proposal.multisig.toString(),
    chainId,
    transactionIndex: proposal.transactionIndex,
    creator: proposal.creator?.toString(),
    createdAt: undefined,
    status: proposal.status,
    approvals: proposal.approvals.map((item) => item.toString()),
    rejections: proposal.rejections.map((item) => item.toString()),
    executed: proposal.executed,
    cancelled: proposal.cancelled,
  };
}

export async function loadSquadsWorkspacePayload(
  multisig: WorkspaceMultisig,
  proposal: WorkspaceProposal,
  chains: ChainConfig[]
): Promise<WorkspacePayload> {
  const chain = getOperationalSquadsChain(chains, multisig.chainId);
  if (!chain) {
    throw new Error("Chain configuration is not available for Squads payloads");
  }

  const programIdString = getSquadsProgramId(chain);
  const programId = new PublicKey(programIdString);
  const multisigPda = new PublicKey(multisig.address);
  const [transactionPda] = multisigSdk.getTransactionPda({
    multisigPda,
    index: proposal.transactionIndex,
    programId,
  });

  const vaultAddress =
    multisig.vaultAddress ??
    multisigSdk
      .getVaultPda({
        multisigPda,
        index: 0,
        programId,
      })[0]
      .toString();

  const squadService = new SquadService(chain.rpcUrl, programIdString);
  const txType = await squadService.getTransactionType(
    multisigPda,
    proposal.transactionIndex
  );

  if (txType === "config") {
    const configTx = await squadService.getConfigTransaction(
      multisigPda,
      proposal.transactionIndex
    );

    return {
      type: "config",
      transactionPda: transactionPda.toString(),
      vaultAddress,
      actions: configTx.actions,
    };
  }

  const vaultTx = await squadService.getVaultTransaction(
    multisigPda,
    proposal.transactionIndex
  );

  return {
    type: "vault",
    transactionPda: transactionPda.toString(),
    vaultAddress,
    instructions: vaultTx.message.instructions.map((instruction) => ({
      programAddress:
        vaultTx.message.accountKeys[instruction.programIdIndex].toString(),
      accountAddresses: (Array.isArray(instruction.accountIndexes)
        ? instruction.accountIndexes
        : Array.from(instruction.accountIndexes)
      ).map((index) => vaultTx.message.accountKeys[index].toString()),
      accountIndexes: Array.isArray(instruction.accountIndexes)
        ? instruction.accountIndexes
        : Array.from(instruction.accountIndexes),
      data: bs58.encode(instruction.data),
    })),
  };
}

export function invalidateSquadsProposalCache(
  chainId: string,
  multisigKey: string,
  chains: ChainConfig[]
) {
  const chain = getOperationalSquadsChain(chains, chainId);
  if (!chain) {
    return;
  }

  const squadService = new SquadService(
    chain.rpcUrl,
    getSquadsProgramId(chain)
  );
  squadService.invalidateProposalCache(new PublicKey(multisigKey));
}

export { toWorkspaceMultisig, toWorkspaceMultisigs };

export const squadsWorkspaceAdapter: WorkspaceProviderAdapter = {
  id: "squads",
  label: "Squads",
  capabilities: {
    creatorSync: true,
    payload: true,
    proposalLoading: true,
    proposalSummary: false,
    proposalActions: true,
  },
  loadProposalsForMultisig({ chains, multisig }) {
    return loadSquadsWorkspaceProposalsForMultisig(
      {
        provider: "squads",
        publicKey: new PublicKey(multisig.address),
        threshold: multisig.threshold,
        members: multisig.members.map((member) => ({
          key: new PublicKey(member.address),
          permissions: { mask: member.permissionsMask },
        })),
        transactionIndex: BigInt(0),
        msChangeIndex: 0,
        chainId: multisig.chainId,
        label: multisig.label,
        tags: multisig.tags,
      },
      chains
    );
  },
  loadPayload({ chains, multisig, proposal }: WorkspacePayloadLoaderOptions) {
    return loadSquadsWorkspacePayload(multisig, proposal, chains);
  },
};

export function fromWorkspaceProposal(
  proposal: WorkspaceProposal
): ProposalAccount {
  return {
    multisig: new PublicKey(proposal.multisigAddress),
    transactionIndex: proposal.transactionIndex,
    creator: proposal.creator ? new PublicKey(proposal.creator) : undefined,
    status: proposal.status,
    approvals: proposal.approvals.map((item) => new PublicKey(item)),
    rejections: proposal.rejections.map((item) => new PublicKey(item)),
    cancelled: proposal.cancelled,
    executed: proposal.executed,
  };
}
