import { NextResponse } from "next/server";

import { loadSafeWorkspacePayload } from "@/lib/safe";

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

  try {
    const payload = await loadSafeWorkspacePayload(
      { id: chainId, name: chainName },
      safeAddress,
      BigInt(nonce)
    );

    return NextResponse.json({ payload });
  } catch (error) {
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
