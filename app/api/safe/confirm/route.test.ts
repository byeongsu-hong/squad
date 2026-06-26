import SafeApiKit from "@safe-global/api-kit";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/safe/confirm/route";

vi.mock("@safe-global/api-kit", () => ({
  default: vi.fn().mockImplementation(function SafeApiKitMock() {
    return {
      confirmTransaction: vi.fn(async () => ({ signature: "0xsigned" })),
    };
  }),
}));

describe("POST /api/safe/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SAFE_API_KEY;
  });

  it("posts confirmations through the SDK-compatible Safe service base URL", async () => {
    process.env.SAFE_API_KEY = " test-safe-api-key ";

    const response = await POST(
      new Request("https://squad.test/api/safe/confirm", {
        method: "POST",
        body: JSON.stringify({
          chainId: "ethereum-mainnet",
          chainName: "Ethereum",
          safeTxHash:
            "0x1111111111111111111111111111111111111111111111111111111111111111",
          signature: "0xsigned",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(SafeApiKit).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-safe-api-key",
        txServiceUrl: "https://api.safe.global/tx-service/eth/api",
      })
    );
  });
});
