import { NextResponse } from "next/server";

import {
  fetchSafeTransactionByHash,
  fetchSafeTransactionByNonce,
} from "@/lib/safe";

const SAFE_TRANSACTION_CACHE_TTL_MS = 15_000;
const safeTransactionCache = new Map<
  string,
  {
    transaction: unknown;
    expiresAt: number;
  }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const chainName = searchParams.get("chainName");
  const safeAddress = searchParams.get("safeAddress");
  const safeTxHash = searchParams.get("safeTxHash");
  const nonce = searchParams.get("nonce");

  if (!chainId || !chainName) {
    return NextResponse.json(
      { error: "Missing chain query parameters." },
      { status: 400 }
    );
  }

  if (!safeTxHash && (!safeAddress || !nonce)) {
    return NextResponse.json(
      {
        error:
          "Provide either safeTxHash or the safeAddress and nonce query parameters.",
      },
      { status: 400 }
    );
  }

  const cacheKey = safeTxHash
    ? `${chainId}:hash:${safeTxHash.toLowerCase()}`
    : `${chainId}:${safeAddress!.toLowerCase()}:${nonce!}`;
  const cachedTransaction = safeTransactionCache.get(cacheKey);
  if (cachedTransaction && cachedTransaction.expiresAt > Date.now()) {
    return NextResponse.json({
      transaction: cachedTransaction.transaction,
      cached: true,
    });
  }

  try {
    const transaction = safeTxHash
      ? await fetchSafeTransactionByHash(
          { id: chainId, name: chainName },
          safeTxHash
        )
      : await fetchSafeTransactionByNonce(
          { id: chainId, name: chainName },
          safeAddress!,
          BigInt(nonce!)
        );

    safeTransactionCache.set(cacheKey, {
      transaction,
      expiresAt: Date.now() + SAFE_TRANSACTION_CACHE_TTL_MS,
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    if (cachedTransaction) {
      return NextResponse.json({
        transaction: cachedTransaction.transaction,
        cached: true,
        unavailableReason:
          error instanceof Error
            ? error.message
            : "Failed to refresh Safe transaction.",
      });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Safe transaction.",
      },
      { status: 500 }
    );
  }
}
