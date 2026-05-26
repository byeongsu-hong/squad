import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const wagmiProviderMock = vi.hoisted(() =>
  vi.fn(({ children }: { children: ReactNode }) => <>{children}</>)
);

vi.mock("wagmi", async (importActual) => {
  const actual = await importActual<typeof import("wagmi")>();
  return {
    ...actual,
    WagmiProvider: wagmiProviderMock,
  };
});

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/lib/initial-config", () => ({
  resolveInitialMultisigs: vi.fn().mockResolvedValue([]),
}));

vi.mock("./proposals-sync", () => ({
  ProposalsSync: () => null,
}));

vi.mock("./refresh-policy-sync", () => ({
  RefreshPolicySync: () => null,
}));

vi.mock("./wallet-adapter-provider", () => ({
  WalletAdapterProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("./wallet-sync", () => ({
  WalletSync: () => null,
}));

import { Providers } from "./providers";

describe("Providers", () => {
  afterEach(() => {
    wagmiProviderMock.mockClear();
  });

  it("does not reconnect EVM wallets on app mount", () => {
    render(
      <Providers>
        <div>content</div>
      </Providers>
    );

    expect(wagmiProviderMock).toHaveBeenCalled();
    expect(wagmiProviderMock.mock.calls[0]?.[0]).toMatchObject({
      reconnectOnMount: false,
    });
  });
});
