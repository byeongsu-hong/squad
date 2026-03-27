import { NextResponse } from "next/server";

import {
  fetchSafeTransactions,
  toWorkspaceProposalFromSafeTransaction,
} from "@/lib/safe";

const SAFE_TRANSACTIONS_CACHE_TTL_MS = 15_000;
const safeTransactionsCache = new Map<
  string,
  {
    proposals: Array<Record<string, unknown>>;
    expiresAt: number;
  }
>();

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

  const limit = limitParam ? Number(limitParam) : 100;
  const normalizedLimit = Number.isFinite(limit) ? limit : 100;
  const cacheKey = `${chainId}:${safeAddress.toLowerCase()}:${normalizedLimit}`;
  const cachedTransactions = safeTransactionsCache.get(cacheKey);
  if (cachedTransactions && cachedTransactions.expiresAt > Date.now()) {
    return NextResponse.json({
      proposals: cachedTransactions.proposals,
      cached: true,
    });
  }

  try {
    const response = await fetchSafeTransactions(
      { id: chainId, name: chainName },
      safeAddress,
      normalizedLimit
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

    safeTransactionsCache.set(cacheKey, {
      proposals,
      expiresAt: Date.now() + SAFE_TRANSACTIONS_CACHE_TTL_MS,
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    if (cachedTransactions) {
      return NextResponse.json({
        proposals: cachedTransactions.proposals,
        cached: true,
        unavailableReason:
          error instanceof Error
            ? error.message
            : "Failed to refresh Safe proposals.",
      });
    }

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
