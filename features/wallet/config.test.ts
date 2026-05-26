import { afterEach, describe, expect, it, vi } from "vitest";

import { wagmiConfig } from "./config";

describe("wagmiConfig", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("does not initialize WalletConnect during server imports", async () => {
    const previousProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    try {
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = "test-project-id";
      vi.stubGlobal("window", undefined);
      vi.resetModules();

      const { wagmiConfig: serverConfig } = await import("./config");

      expect(
        serverConfig.connectors.map((connector) => connector.name)
      ).not.toContain("WalletConnect");
    } finally {
      if (previousProjectId === undefined) {
        delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      } else {
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = previousProjectId;
      }
      vi.resetModules();
    }
  });
});
