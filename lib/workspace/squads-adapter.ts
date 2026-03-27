import { PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";
import bs58 from "bs58";

import { SquadService } from "@/lib/squad";
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
  WorkspaceExplorerView,
  WorkspaceMultisig,
  WorkspacePayload,
  WorkspaceProposal,
  WorkspaceQueueItem,
  WorkspaceRegistryItem,
} from "@/types/workspace";

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

export async function loadSquadsWorkspaceProposals(
  multisigs: MultisigAccount[],
  chains: ChainConfig[]
): Promise<WorkspaceProposal[]> {
  const groupedResults = await Promise.all(
    multisigs.map(async (multisig) => {
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

      return Promise.all(
        proposalAccounts.map((account) =>
          toWorkspaceProposal(
            account.account.multisig,
            account,
            chain,
            squadService
          )
        )
      );
    })
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

  const proposals = await Promise.all(
    proposalAccounts.map((account) =>
      toWorkspaceProposal(
        account.account.multisig,
        account,
        chain,
        squadService
      )
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
    multisigKey: multisigKey.toString(),
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
    multisigKey: proposal.multisig.toString(),
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

export function buildWorkspaceRegistryItems(
  multisigs: WorkspaceMultisig[],
  queueItems: WorkspaceQueueItem[],
  searchNeedle: string
): WorkspaceRegistryItem[] {
  return multisigs
    .map((multisig) => {
      const scopedQueue = queueItems.filter(
        (item) => item.multisig.key === multisig.key
      );

      return {
        multisig,
        waiting: scopedQueue.filter((item) => item.needsYourSignature).length,
        executable: scopedQueue.filter((item) => item.readyToExecute).length,
        active: scopedQueue.filter(
          (item) =>
            item.proposal.status !== "Executed" &&
            item.proposal.status !== "Cancelled"
        ).length,
      };
    })
    .filter((item) => {
      if (!searchNeedle) {
        return true;
      }

      return (
        item.multisig.label?.toLowerCase().includes(searchNeedle) ||
        item.multisig.key.toLowerCase().includes(searchNeedle) ||
        item.multisig.chainName.toLowerCase().includes(searchNeedle)
      );
    });
}

export function buildWorkspaceExplorerViews(
  registryItems: WorkspaceRegistryItem[]
): WorkspaceExplorerView[] {
  const attentionKeys = registryItems
    .filter((item) => item.waiting > 0 || item.executable > 0)
    .map((item) => item.multisig.key);
  const untaggedKeys = registryItems
    .filter((item) => item.multisig.tags.length === 0)
    .map((item) => item.multisig.key);

  const chainViews = Array.from(
    new Map(
      registryItems.map((item) => [
        `chain:${item.multisig.chainName}`,
        {
          id: `chain:${item.multisig.chainName}`,
          label: item.multisig.chainName,
          multisigKeys: registryItems
            .filter(
              (entry) => entry.multisig.chainName === item.multisig.chainName
            )
            .map((entry) => entry.multisig.key),
          description: "Chain scope",
          meta: `${registryItems.filter((entry) => entry.multisig.chainName === item.multisig.chainName).length} multisigs`,
        } satisfies WorkspaceExplorerView,
      ])
    ).values()
  );

  const tagViews = Array.from(
    new Map(
      registryItems
        .flatMap((item) =>
          item.multisig.tags.map((tag) => [
            `tag:${tag}`,
            {
              id: `tag:${tag}`,
              label: tag,
              multisigKeys: registryItems
                .filter((entry) => entry.multisig.tags.includes(tag))
                .map((entry) => entry.multisig.key),
              description: "Saved grouping",
              meta: `${registryItems.filter((entry) => entry.multisig.tags.includes(tag)).length} multisigs`,
            } satisfies WorkspaceExplorerView,
          ])
        )
        .filter((entry): entry is [string, WorkspaceExplorerView] =>
          Boolean(entry)
        )
    ).values()
  );

  return [
    {
      id: "all",
      label: "All multisigs",
      multisigKeys: registryItems.map((item) => item.multisig.key),
      description: "Everything in scope",
      meta: `${registryItems.length} multisigs`,
    },
    {
      id: "attention",
      label: "Needs attention",
      multisigKeys: attentionKeys,
      description: "Waiting on you or ready to execute",
      meta: `${attentionKeys.length} multisigs`,
    },
    ...chainViews,
    {
      id: "tag:none",
      label: "No tags",
      multisigKeys: untaggedKeys,
      description: "Multisigs without saved tags",
      meta: `${untaggedKeys.length} multisigs`,
    },
    ...tagViews,
  ].filter((view) => view.multisigKeys.length > 0 || view.id === "all");
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
  const multisigPda = new PublicKey(multisig.key);
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
        publicKey: new PublicKey(multisig.key),
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
    multisig: new PublicKey(proposal.multisigKey),
    transactionIndex: proposal.transactionIndex,
    creator: proposal.creator ? new PublicKey(proposal.creator) : undefined,
    status: proposal.status,
    approvals: proposal.approvals.map((item) => new PublicKey(item)),
    rejections: proposal.rejections.map((item) => new PublicKey(item)),
    cancelled: proposal.cancelled,
    executed: proposal.executed,
  };
}
