import { NextResponse } from "next/server";

import { loadSafeWorkspacePayload } from "@/lib/safe";

const SAFE_PAYLOAD_CACHE_TTL_MS = 15_000;
const safePayloadCache = new Map<
  string,
  {
    payload: unknown;
    expiresAt: number;
  }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const chainName = searchParams.get("chainName");
  const safeAddress = searchParams.get("safeAddress");
  const nonce = searchParams.get("nonce");

  if (!chainId || !chainName || !safeAddress || !nonce) {
    return NextResponse.json(
      { error: "Missing chain, Safe address, or nonce query parameters." },
      { status: 400 }
    );
  }

  const cacheKey = `${chainId}:${safeAddress.toLowerCase()}:${nonce}`;
  const cachedPayload = safePayloadCache.get(cacheKey);
  if (cachedPayload && cachedPayload.expiresAt > Date.now()) {
    return NextResponse.json({
      payload: cachedPayload.payload,
      cached: true,
    });
  }

  try {
    const payload = await loadSafeWorkspacePayload(
      { id: chainId, name: chainName },
      safeAddress,
      BigInt(nonce)
    );

    safePayloadCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + SAFE_PAYLOAD_CACHE_TTL_MS,
    });

    return NextResponse.json({ payload });
  } catch (error) {
    if (cachedPayload) {
      return NextResponse.json({
        payload: cachedPayload.payload,
        cached: true,
        unavailableReason:
          error instanceof Error
            ? error.message
            : "Failed to refresh Safe payload.",
      });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Safe payload.",
      },
      { status: 500 }
    );
  }
}
