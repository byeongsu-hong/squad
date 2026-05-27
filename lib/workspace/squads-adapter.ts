import { PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";
import bs58 from "bs58";

import { SquadService } from "@/lib/squad";
import {
  SquadsV3Service,
  toSquadsV3MultisigAccount,
  toSquadsV3WorkspacePayload,
  toSquadsV3WorkspaceProposal,
} from "@/lib/squads-v3";
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
  getChainRpcUrls,
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

function getSquadsVersion(multisig: Pick<MultisigAccount, "squadsVersion">) {
  return multisig.squadsVersion ?? "v4";
}

export async function loadSquadsMultisigAccount(
  chain: ChainConfig,
  multisigAddress: string,
  label?: string,
  tags?: string[]
): Promise<MultisigAccount> {
  const normalizedChain = getOperationalSquadsChain([chain], chain.id);
  if (!normalizedChain) {
    throw new Error(`Chain ${chain.name} is not configured for Squads.`);
  }

  const multisigPubkey = new PublicKey(multisigAddress);
  const programIdString = getSquadsProgramId(normalizedChain, "v4");
  const squadService = new SquadService(
    getChainRpcUrls(normalizedChain),
    programIdString,
    { chainId: normalizedChain.id }
  );

  try {
    const multisigAccount = await squadService.getMultisig(multisigPubkey);
    const programId = new PublicKey(programIdString);
    const [vaultPda] = multisigSdk.getVaultPda({
      multisigPda: multisigPubkey,
      index: 0,
      programId,
    });

    return {
      provider: "squads",
      squadsVersion: "v4",
      publicKey: multisigPubkey,
      threshold: multisigAccount.threshold,
      members: multisigAccount.members.map((m) => ({
        key: m.key,
        permissions: { mask: m.permissions.mask },
      })),
      transactionIndex: BigInt(multisigAccount.transactionIndex.toString()),
      msChangeIndex: 0,
      programId,
      chainId: normalizedChain.id,
      label,
      tags,
      vaultPda,
    };
  } catch (v4Error) {
    if (!normalizedChain.squadsV3ProgramId) {
      throw v4Error;
    }

    const v3Service = new SquadsV3Service(
      getChainRpcUrls(normalizedChain),
      getSquadsProgramId(normalizedChain, "v3"),
      { chainId: normalizedChain.id }
    );
    const v3Account = await v3Service.getMultisig(multisigPubkey);
    return toSquadsV3MultisigAccount(multisigPubkey, v3Account, {
      chainId: normalizedChain.id,
      label,
      tags,
      programId: new PublicKey(getSquadsProgramId(normalizedChain, "v3")),
    });
  }
}

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

      if (getSquadsVersion(multisig) === "v3") {
        const service = new SquadsV3Service(
          getChainRpcUrls(chain),
          getSquadsProgramId(chain, "v3"),
          { chainId: chain.id }
        );
        return (
          await service.getTransactionsByMultisig(multisig.publicKey)
        ).map((transaction) =>
          toSquadsV3WorkspaceProposal(transaction.account, chain.id)
        );
      }

      const squadService = new SquadService(
        getChainRpcUrls(chain),
        getSquadsProgramId(chain),
        { chainId: chain.id }
      );
      const proposalAccounts = await squadService.getProposalsByMultisig(
        multisig.publicKey
      );

      const transactionIndices = proposalAccounts.map((a) =>
        BigInt(a.account.transactionIndex.toString())
      );
      const creatorMap = await squadService.getBatchedTransactionCreators(
        multisig.publicKey,
        transactionIndices
      );

      return proposalAccounts.map((account) => {
        const transactionIndex = BigInt(
          account.account.transactionIndex.toString()
        );
        return toWorkspaceProposal(
          account.account.multisig,
          account,
          chain,
          creatorMap.get(transactionIndex.toString())
        );
      });
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
  const squadService = new SquadService(
    getChainRpcUrls(chain),
    programIdString,
    {
      chainId: chain.id,
    }
  );
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
      squadsVersion: "v4",
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

  if (getSquadsVersion(multisig) === "v3") {
    const service = new SquadsV3Service(
      getChainRpcUrls(chain),
      getSquadsProgramId(chain, "v3"),
      { chainId: chain.id }
    );
    return (await service.getTransactionsByMultisig(multisig.publicKey)).map(
      (transaction) =>
        toSquadsV3WorkspaceProposal(transaction.account, chain.id)
    );
  }

  const squadService = new SquadService(
    getChainRpcUrls(chain),
    getSquadsProgramId(chain),
    { chainId: chain.id }
  );
  const proposalAccounts = await squadService.getProposalsByMultisig(
    multisig.publicKey
  );

  const transactionIndices = proposalAccounts.map((a) =>
    BigInt(a.account.transactionIndex.toString())
  );
  const creatorMap = await squadService.getBatchedTransactionCreators(
    multisig.publicKey,
    transactionIndices
  );

  return proposalAccounts
    .map((account) => {
      const transactionIndex = BigInt(
        account.account.transactionIndex.toString()
      );
      return toWorkspaceProposal(
        account.account.multisig,
        account,
        chain,
        creatorMap.get(transactionIndex.toString())
      );
    })
    .filter((proposal): proposal is WorkspaceProposal => proposal !== null)
    .sort((left, right) =>
      Number(right.transactionIndex - left.transactionIndex)
    );
}

function toWorkspaceProposal(
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
  creator: PublicKey | undefined
): WorkspaceProposal | null {
  const status = toProposalStatus(proposalAccount.account.status.__kind);
  const transactionIndex = BigInt(
    proposalAccount.account.transactionIndex.toString()
  );

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
  const active =
    !proposal.executed &&
    !proposal.cancelled &&
    (proposal.status === "Active" || proposal.status === "Approved");
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

async function loadSquadsWorkspacePayload(
  multisig: WorkspaceMultisig,
  proposal: WorkspaceProposal,
  chains: ChainConfig[]
): Promise<WorkspacePayload> {
  const chain = getOperationalSquadsChain(chains, multisig.chainId);
  if (!chain) {
    throw new Error("Chain configuration is not available for Squads payloads");
  }

  const multisigPda = new PublicKey(multisig.address);

  if (multisig.squadsVersion === "v3") {
    const v3ProgramId = getSquadsProgramId(chain, "v3");
    const service = new SquadsV3Service(getChainRpcUrls(chain), v3ProgramId, {
      chainId: chain.id,
    });
    const transaction = await service.getTransaction(
      multisigPda,
      Number(proposal.transactionIndex)
    );
    const instructions = await service.getInstructions(
      transaction.publicKey,
      transaction.account.instructionIndex
    );

    return toSquadsV3WorkspacePayload(
      transaction.account,
      transaction.publicKey,
      instructions.map((instruction) => instruction.account),
      new PublicKey(v3ProgramId)
    );
  }

  const programIdString = getSquadsProgramId(chain);
  const programId = new PublicKey(programIdString);
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

  const squadService = new SquadService(
    getChainRpcUrls(chain),
    programIdString,
    {
      chainId: chain.id,
    }
  );

  const accountInfo = await squadService.getAccountInfo(transactionPda, {
    operationName: "Get workspace transaction payload",
    cacheKey: `workspacePayload:${chain.id}:${transactionPda.toBase58()}`,
  });
  if (!accountInfo) {
    throw new Error(
      "Transaction account not found. Please ensure the proposal was fully created on-chain."
    );
  }
  if (!accountInfo.owner.equals(new PublicKey(programIdString))) {
    throw new Error("Invalid transaction account owner");
  }

  const discriminator = accountInfo.data.subarray(0, 8);
  const isConfig = discriminator.every(
    (byte, k) => byte === multisigSdk.accounts.configTransactionDiscriminator[k]
  );

  if (isConfig) {
    const [configTx] =
      multisigSdk.accounts.ConfigTransaction.fromAccountInfo(accountInfo);
    return {
      type: "config",
      transactionPda: transactionPda.toString(),
      vaultAddress,
      actions: configTx.actions,
    };
  }

  const [vaultTx] =
    multisigSdk.accounts.VaultTransaction.fromAccountInfo(accountInfo);
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
        squadsVersion: multisig.squadsVersion,
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
