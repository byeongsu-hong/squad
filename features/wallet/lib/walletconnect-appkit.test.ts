import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const requireFromTest = createRequire(import.meta.url);

function resolveAppKitCoreFrom(packageName: string) {
  const packageEntry = requireFromTest.resolve(packageName);
  return createRequire(packageEntry).resolve("@reown/appkit/core");
}

describe("WalletConnect AppKit resolution", () => {
  it("uses one AppKit implementation for EVM and SVM WalletConnect", () => {
    const rootAppKit = requireFromTest.resolve("@reown/appkit/core");
    const evmAppKit = resolveAppKitCoreFrom("@walletconnect/ethereum-provider");
    const svmAppKit = resolveAppKitCoreFrom("@walletconnect/solana-adapter");

    expect(evmAppKit).toBe(rootAppKit);
    expect(svmAppKit).toBe(rootAppKit);
  });
});
