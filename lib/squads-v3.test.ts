import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";
import { describe, expect, it } from "vitest";

import {
  SQUADS_V3_PROGRAM_ID,
  buildSquadsV3ApproveInstruction,
  buildSquadsV3ExecuteInstruction,
  buildSquadsV3RejectInstruction,
  deriveSquadsV3InstructionPda,
  deriveSquadsV3TransactionPda,
  parseSquadsV3InstructionAccount,
  parseSquadsV3MultisigAccount,
  parseSquadsV3TransactionAccount,
  toSquadsV3WorkspaceProposal,
} from "@/lib/squads-v3";
import { getWorkspaceMultisigKey } from "@/types/workspace";

const MULTISIG = new PublicKey("GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS");
const CREATE_KEY = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);
const CREATOR = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWcH8Jk9vH8U1Xza");
const MEMBER_A = new PublicKey("2nyh9HSoxWNVXw6CfiWZFPMqFDDQ3vaG33Z39hVxLjcm");
const MEMBER_B = new PublicKey("36WfhmnUJ2RK4W9j4cmUuGZpuLgD52sjW2SXYCiyvQ1F");
const PROGRAM = new PublicKey("11111111111111111111111111111111");
const ACCOUNT = new PublicKey("SysvarC1ock11111111111111111111111111111111");

function u8(value: number) {
  return Buffer.from([value]);
}

function bool(value: boolean) {
  return u8(value ? 1 : 0);
}

function u16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

function bytes(value: Buffer) {
  return Buffer.concat([u32(value.length), value]);
}

function anchorDiscriminator(name: string) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function publicKey(value: PublicKey) {
  return Buffer.from(value.toBytes());
}

function publicKeyVec(keys: PublicKey[]) {
  return Buffer.concat([u32(keys.length), ...keys.map(publicKey)]);
}

describe("Squads V3 helpers", () => {
  it("derives V3 transaction and instruction PDAs with legacy seed order", () => {
    expect(deriveSquadsV3TransactionPda(MULTISIG, 7)[0].toBase58()).toBe(
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("squad"),
          MULTISIG.toBuffer(),
          u32(7),
          Buffer.from("transaction"),
        ],
        SQUADS_V3_PROGRAM_ID
      )[0].toBase58()
    );

    const [transactionPda] = deriveSquadsV3TransactionPda(MULTISIG, 7);
    expect(deriveSquadsV3InstructionPda(transactionPda, 2)[0].toBase58()).toBe(
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("squad"),
          transactionPda.toBuffer(),
          u8(2),
          Buffer.from("instruction"),
        ],
        SQUADS_V3_PROGRAM_ID
      )[0].toBase58()
    );
  });

  it("decodes a V3 multisig account into app-compatible member metadata", () => {
    const account = parseSquadsV3MultisigAccount({
      executable: false,
      lamports: 1,
      owner: SQUADS_V3_PROGRAM_ID,
      rentEpoch: 0,
      data: Buffer.concat([
        Buffer.alloc(8),
        u16(2),
        u16(3),
        u32(9),
        u32(4),
        u8(255),
        publicKey(CREATE_KEY),
        bool(false),
        publicKeyVec([MEMBER_A, MEMBER_B]),
      ]),
    });

    expect(account).toMatchObject({
      threshold: 2,
      authorityIndex: 3,
      transactionIndex: 9,
      msChangeIndex: 4,
      bump: 255,
      createKey: CREATE_KEY,
      allowExternalExecute: false,
    });
    expect(account.members).toEqual([MEMBER_A, MEMBER_B]);
  });

  it("maps V3 transaction status into workspace proposal semantics", () => {
    const transactionAccount = parseSquadsV3TransactionAccount({
      executable: false,
      lamports: 1,
      owner: SQUADS_V3_PROGRAM_ID,
      rentEpoch: 0,
      data: Buffer.concat([
        Buffer.alloc(8),
        publicKey(CREATOR),
        publicKey(MULTISIG),
        u32(11),
        u32(1),
        u8(254),
        u8(2),
        u8(3),
        u8(253),
        publicKeyVec([MEMBER_A, MEMBER_B]),
        publicKeyVec([]),
        publicKeyVec([]),
        u8(0),
      ]),
    });

    expect(transactionAccount).toMatchObject({
      creator: CREATOR,
      multisig: MULTISIG,
      transactionIndex: 11,
      authorityIndex: 1,
      status: "ExecuteReady",
      instructionIndex: 3,
      approvals: [MEMBER_A, MEMBER_B],
      rejections: [],
      cancellations: [],
    });

    expect(
      toSquadsV3WorkspaceProposal(transactionAccount, "solana-mainnet")
    ).toEqual({
      provider: "squads",
      multisigKey: getWorkspaceMultisigKey(
        "solana-mainnet",
        MULTISIG.toBase58()
      ),
      multisigAddress: MULTISIG.toBase58(),
      chainId: "solana-mainnet",
      transactionIndex: 11n,
      creator: CREATOR.toBase58(),
      createdAt: undefined,
      status: "Approved",
      approvals: [MEMBER_A.toBase58(), MEMBER_B.toBase58()],
      rejections: [],
      executed: false,
      cancelled: false,
    });
  });

  it("decodes V3 instruction account payloads", () => {
    const instruction = parseSquadsV3InstructionAccount({
      executable: false,
      lamports: 1,
      owner: SQUADS_V3_PROGRAM_ID,
      rentEpoch: 0,
      data: Buffer.concat([
        Buffer.alloc(8),
        publicKey(PROGRAM),
        u32(1),
        publicKey(ACCOUNT),
        bool(false),
        bool(true),
        bytes(Buffer.from([1, 2, 3, 4])),
        u8(2),
        u8(252),
        bool(false),
      ]),
    });

    expect(instruction).toEqual({
      programId: PROGRAM,
      keys: [{ pubkey: ACCOUNT, isSigner: false, isWritable: true }],
      data: Buffer.from([1, 2, 3, 4]),
      instructionIndex: 2,
      bump: 252,
      executed: false,
    });
  });

  it("builds V3 approve and reject transaction instructions with legacy accounts", () => {
    const [transactionPda] = deriveSquadsV3TransactionPda(MULTISIG, 7);

    const approve = buildSquadsV3ApproveInstruction({
      multisigPda: MULTISIG,
      transactionIndex: 7n,
      member: MEMBER_A,
    });
    const reject = buildSquadsV3RejectInstruction({
      multisigPda: MULTISIG,
      transactionIndex: 7n,
      member: MEMBER_A,
    });

    for (const instruction of [approve, reject]) {
      expect(instruction.programId).toEqual(SQUADS_V3_PROGRAM_ID);
      expect(
        instruction.keys.map((key) => ({
          pubkey: key.pubkey.toBase58(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        }))
      ).toEqual([
        {
          pubkey: MULTISIG.toBase58(),
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: transactionPda.toBase58(),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: MEMBER_A.toBase58(),
          isSigner: true,
          isWritable: true,
        },
      ]);
    }

    expect(approve.data).toEqual(anchorDiscriminator("approve_transaction"));
    expect(reject.data).toEqual(anchorDiscriminator("reject_transaction"));
  });

  it("builds a V3 execute transaction instruction with SDK-compatible account indexes", () => {
    const [transactionPda] = deriveSquadsV3TransactionPda(MULTISIG, 11);
    const [firstInstructionPda] = deriveSquadsV3InstructionPda(
      transactionPda,
      1
    );
    const [secondInstructionPda] = deriveSquadsV3InstructionPda(
      transactionPda,
      2
    );

    const instruction = buildSquadsV3ExecuteInstruction({
      transactionPda,
      transaction: {
        creator: CREATOR,
        multisig: MULTISIG,
        transactionIndex: 11,
        authorityIndex: 1,
        authorityBump: 254,
        status: "ExecuteReady",
        instructionIndex: 2,
        bump: 253,
        approvals: [MEMBER_A, MEMBER_B],
        rejections: [],
        cancellations: [],
        executedIndex: 0,
      },
      instructions: [
        {
          publicKey: firstInstructionPda,
          account: {
            programId: PROGRAM,
            keys: [{ pubkey: ACCOUNT, isSigner: false, isWritable: true }],
            data: Buffer.from([1]),
            instructionIndex: 1,
            bump: 251,
            executed: false,
          },
        },
        {
          publicKey: secondInstructionPda,
          account: {
            programId: PROGRAM,
            keys: [{ pubkey: ACCOUNT, isSigner: false, isWritable: false }],
            data: Buffer.from([2]),
            instructionIndex: 2,
            bump: 250,
            executed: false,
          },
        },
      ],
      member: MEMBER_A,
    });

    expect(instruction.programId).toEqual(SQUADS_V3_PROGRAM_ID);
    expect(
      instruction.keys.map((key) => ({
        pubkey: key.pubkey.toBase58(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      }))
    ).toEqual([
      { pubkey: MULTISIG.toBase58(), isSigner: false, isWritable: true },
      {
        pubkey: transactionPda.toBase58(),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: MEMBER_A.toBase58(), isSigner: true, isWritable: true },
      {
        pubkey: firstInstructionPda.toBase58(),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: PROGRAM.toBase58(), isSigner: false, isWritable: false },
      { pubkey: ACCOUNT.toBase58(), isSigner: false, isWritable: true },
      {
        pubkey: secondInstructionPda.toBase58(),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: ACCOUNT.toBase58(), isSigner: false, isWritable: false },
    ]);
    expect(instruction.data).toEqual(
      Buffer.concat([
        anchorDiscriminator("execute_transaction"),
        u32(6),
        Buffer.from([0, 1, 2, 3, 1, 4]),
      ])
    );
  });
});
