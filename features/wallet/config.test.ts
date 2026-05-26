import { describe, expect, it } from "vitest";

import { wagmiConfig } from "./config";

describe("wagmiConfig", () => {
  it("does not discover injected EVM wallets before the user opens wallet UI", () => {
    expect(wagmiConfig._internal.mipd).toBeUndefined();
  });
});
