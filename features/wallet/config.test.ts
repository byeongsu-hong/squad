import { describe, expect, it } from "vitest";

import { wagmiConfig } from "./config";

describe("wagmiConfig", () => {
  it("keeps injected wallet discovery enabled for branded EVM wallet rows", () => {
    expect(wagmiConfig._internal.mipd).toBeDefined();
  });

  it("does not add a generic injected fallback connector", () => {
    expect(
      wagmiConfig.connectors.map((connector) => connector.name)
    ).not.toContain("Injected");
  });

  it("adds an explicit OKX EVM connector", () => {
    expect(wagmiConfig.connectors.map((connector) => connector.name)).toContain(
      "OKX Wallet"
    );
  });
});
