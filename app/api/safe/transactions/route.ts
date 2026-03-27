import { NextResponse } from "next/server";

import {
  fetchSafeTransactions,
  toWorkspaceProposalFromSafeTransaction,
} from "@/lib/safe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const chainName = searchParams.get("chainName");
  const safeAddress = searchParams.get("safeAddress");
  const limitParam = searchParams.get("limit");

  if (!chainId || !chainName || !safeAddress) {
    return NextResponse.json(
      { error: "Missing chain or Safe address query parameters." },
      { status: 400 }
    );
  }

  try {
    const limit = limitParam ? Number(limitParam) : 100;
    const response = await fetchSafeTransactions(
      { id: chainId, name: chainName },
      safeAddress,
      Number.isFinite(limit) ? limit : 100
    );

    const proposals = response.results
      .map((item) =>
        toWorkspaceProposalFromSafeTransaction(item, chainId, safeAddress)
      )
      .filter((item) => item !== null)
      .map((item) => ({
        ...item,
        transactionIndex: item.transactionIndex.toString(),
      }))
      .sort((left, right) =>
        Number(BigInt(right.transactionIndex) - BigInt(left.transactionIndex))
      );

    return NextResponse.json({ proposals });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Safe proposals.",
      },
      { status: 500 }
    );
  }
}
