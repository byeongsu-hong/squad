import { NextResponse } from "next/server";

import {
  fetchSafeTransactionByHash,
  fetchSafeTransactionByNonce,
} from "@/lib/safe";

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

    return NextResponse.json({ transaction });
  } catch (error) {
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
