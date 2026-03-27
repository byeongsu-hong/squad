import { NextResponse } from "next/server";

import { fetchSafeTransactions } from "@/lib/safe";

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

  try {
    const response = await fetchSafeTransactions(
      { id: chainId, name: chainName },
      safeAddress,
      1
    );

    return NextResponse.json({ totalCount: response.count });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Safe proposal summary.",
      },
      { status: 500 }
    );
  }
}
