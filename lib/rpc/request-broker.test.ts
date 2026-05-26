import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  RequestBroker,
  type RequestBrokerDegradedReason,
} from "@/lib/rpc/request-broker";

describe("RequestBroker", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("deduplicates identical in-flight requests", async () => {
    const broker = new RequestBroker();
    let calls = 0;

    const request = () =>
      broker.fetch({
        key: "same-request",
        chainId: "ethereum-mainnet",
        endpoints: ["https://rpc.example"],
        request: async () => {
          calls += 1;
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { ok: true };
        },
      });

    const [left, right] = await Promise.all([request(), request()]);

    expect(calls).toBe(1);
    expect(left.data).toEqual({ ok: true });
    expect(right.data).toEqual({ ok: true });
  });

  it("enforces per-chain concurrency", async () => {
    const broker = new RequestBroker({ defaultConcurrency: 2 });
    let active = 0;
    let peak = 0;

    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        broker.fetch({
          key: `request-${index}`,
          chainId: "solana-mainnet",
          endpoints: ["https://rpc.example"],
          request: async () => {
            active += 1;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;
            return index;
          },
        })
      )
    );

    expect(peak).toBeLessThanOrEqual(2);
  });

  it("falls back to the next endpoint for retryable RPC failures", async () => {
    const broker = new RequestBroker();
    const endpoints: string[] = [];

    const result = await broker.fetch({
      key: "fallback-request",
      chainId: "base-mainnet",
      endpoints: ["https://primary.example", "https://fallback.example"],
      request: async (endpoint) => {
        endpoints.push(endpoint);
        if (endpoint.includes("primary")) {
          throw new Error("429 Too Many Requests");
        }
        return endpoint;
      },
    });

    expect(endpoints).toEqual([
      "https://primary.example",
      "https://fallback.example",
    ]);
    expect(result.data).toBe("https://fallback.example");
    expect(result.degradedReason?.kind).toBe("fallback");
  });

  it("returns stale cache when all fallback endpoints fail", async () => {
    const degradedReasons: RequestBrokerDegradedReason[] = [];
    const broker = new RequestBroker({
      onDegraded: (reason) => degradedReasons.push(reason),
    });

    await broker.fetch({
      key: "stale-request",
      chainId: "ethereum-mainnet",
      endpoints: ["https://primary.example"],
      ttlMs: 1,
      request: async () => "fresh",
    });

    await new Promise((resolve) => setTimeout(resolve, 2));

    const stale = await broker.fetch({
      key: "stale-request",
      chainId: "ethereum-mainnet",
      endpoints: ["https://primary.example", "https://fallback.example"],
      request: async () => {
        throw new Error("network error");
      },
    });

    expect(stale.data).toBe("fresh");
    expect(stale.stale).toBe(true);
    expect(stale.degradedReason?.kind).toBe("stale");
    expect(degradedReasons.some((reason) => reason.kind === "stale")).toBe(
      true
    );
  });
});
