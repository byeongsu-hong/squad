import { NextResponse } from "next/server";

import { loadSafeMultisig } from "@/lib/safe";
import type { ChainConfig } from "@/types/chain";

interface SafeImportRequestBody {
  chain: ChainConfig;
  addressInput: string;
  label?: string;
  tags?: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SafeImportRequestBody;

    if (!body.chain || !body.addressInput) {
      return NextResponse.json(
        { error: "Missing chain configuration or Safe address." },
        { status: 400 }
      );
    }

    const multisig = await loadSafeMultisig(
      body.chain,
      body.addressInput,
      body.label,
      body.tags
    );

    return NextResponse.json({
      multisig: {
        ...multisig,
        transactionIndex: multisig.transactionIndex.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import Safe multisig.",
      },
      { status: 500 }
    );
  }
}
