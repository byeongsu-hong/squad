import { WalletReadyState } from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBrowserWallet } from "./use-browser-wallet";

const walletsMock = vi.hoisted(() => ({
  value: [] as Wallet[],
}));
const selectMock = vi.hoisted(() => vi.fn());
const disconnectMock = vi.hoisted(() => vi.fn());
const connectBrowserMock = vi.hoisted(() => vi.fn());

vi.mock("@solana/wallet-adapter-react", async (importActual) => {
  const actual =
    await importActual<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => ({
      disconnect: disconnectMock,
      select: selectMock,
      wallets: walletsMock.value,
    }),
  };
});

vi.mock("@/stores/wallet-store", () => ({
  useWalletStore: () => ({
    connectBrowser: connectBrowserMock,
  }),
}));

describe("useBrowserWallet", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    walletsMock.value = [];
    selectMock.mockClear();
    disconnectMock.mockClear();
    connectBrowserMock.mockClear();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not log WalletConnect modal close as a failed connection", async () => {
    const closedError = Object.assign(new Error("Wallet window closed"), {
      name: "WalletWindowClosedError",
    });
    const wallet = {
      adapter: {
        connect: vi.fn().mockRejectedValue(closedError),
        connected: false,
        icon: null,
        name: "WalletConnect",
        off: vi.fn(),
        on: vi.fn(),
        publicKey: null,
        url: "https://walletconnect.com",
      },
      readyState: WalletReadyState.Installed,
    } as unknown as Wallet;
    walletsMock.value = [wallet];

    const { result } = renderHook(() => useBrowserWallet());

    await expect(result.current.connect(wallet)).rejects.toBe(closedError);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
