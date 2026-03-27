import SafeApiKit from "@safe-global/api-kit";
import { NextResponse } from "next/server";

import {
  getSafeChainNumericId,
  getSafeTransactionServiceBaseUrl,
} from "@/lib/safe";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      chainId?: string;
      chainName?: string;
      safeTxHash?: string;
      signature?: string;
    };

    if (
      !body.chainId ||
      !body.chainName ||
      !body.safeTxHash ||
      !body.signature
    ) {
      return NextResponse.json(
        { error: "Missing chain, Safe transaction hash, or signature." },
        { status: 400 }
      );
    }

    const chain = {
      id: body.chainId,
      name: body.chainName,
    };
    const numericChainId = getSafeChainNumericId(chain);
    const txServiceUrl = getSafeTransactionServiceBaseUrl(chain);

    if (!numericChainId || !txServiceUrl) {
      return NextResponse.json(
        { error: `Safe confirmations are not configured for ${chain.name}.` },
        { status: 400 }
      );
    }

    const apiKit = new SafeApiKit({
      chainId: numericChainId,
      txServiceUrl,
    });

    const confirmation = await apiKit.confirmTransaction(
      body.safeTxHash,
      body.signature
    );

    return NextResponse.json({ confirmation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm Safe transaction.",
      },
      { status: 500 }
    );
  }
}
