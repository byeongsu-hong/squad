import { NextResponse } from "next/server";

import { fetchSafeTransactions } from "@/lib/safe";

const SAFE_SUMMARY_CACHE_TTL_MS = 30_000;
const safeSummaryCache = new Map<
  string,
  {
    totalCount: number;
    unavailableReason?: string;
    expiresAt: number;
  }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const chainName = searchParams.get("chainName");
  const safeAddress = searchParams.get("safeAddress");

  if (!chainId || !chainName || !safeAddress) {
    return NextResponse.json(
      { error: "Missing chain or Safe address query parameters." },
      { status: 400 }
    );
  }

  const cacheKey = `${chainId}:${safeAddress.toLowerCase()}`;
  const cachedSummary = safeSummaryCache.get(cacheKey);
  if (cachedSummary && cachedSummary.expiresAt > Date.now()) {
    return NextResponse.json({
      totalCount: cachedSummary.totalCount,
      unavailableReason: cachedSummary.unavailableReason,
      cached: true,
    });
  }

  try {
    const response = await fetchSafeTransactions(
      { id: chainId, name: chainName },
      safeAddress,
      1
    );

    safeSummaryCache.set(cacheKey, {
      totalCount: response.count,
      expiresAt: Date.now() + SAFE_SUMMARY_CACHE_TTL_MS,
    });

    return NextResponse.json({ totalCount: response.count });
  } catch (error) {
    if (cachedSummary) {
      return NextResponse.json({
        totalCount: cachedSummary.totalCount,
        unavailableReason:
          error instanceof Error
            ? error.message
            : "Failed to refresh Safe proposal summary.",
        cached: true,
      });
    }

    return NextResponse.json({
      totalCount: 0,
      unavailableReason:
        error instanceof Error
          ? error.message
          : "Failed to load Safe proposal summary.",
    });
  }
}
