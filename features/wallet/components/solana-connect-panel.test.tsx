import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SolanaConnectPanel } from "./solana-connect-panel";

const connectBrowserWalletMock = vi.hoisted(() => vi.fn());
const browserWalletState = vi.hoisted(() => ({
  installedWallets: [],
  availableWallets: [],
}));

vi.mock("next/image", () => ({
  default: (
    props: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }
  ) => {
    const { alt, src, ...imgProps } = props;
    delete imgProps.unoptimized;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={typeof src === "string" ? src : ""} {...imgProps} />
    );
  },
}));

vi.mock("../hooks/use-browser-wallet", () => ({
  useBrowserWallet: () => ({
    ...browserWalletState,
    connect: connectBrowserWalletMock,
  }),
}));

vi.mock("@/lib/okx-wallet", () => ({
  okxWalletService: {
    connect: vi.fn(),
    isInstalled: () => false,
  },
}));

vi.mock("@/stores/wallet-store", () => ({
  useWalletStore: () => ({
    connectOkx: vi.fn(),
  }),
}));

describe("SolanaConnectPanel", () => {
  beforeEach(() => {
    connectBrowserWalletMock.mockClear();
    browserWalletState.installedWallets = [];
    browserWalletState.availableWallets = [];
  });

  it("keeps WalletConnect visible and explains missing configuration", () => {
    render(<SolanaConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /WalletConnect/ }));

    expect(
      screen.getByText("WalletConnect project id is not configured.")
    ).toBeTruthy();
    expect(connectBrowserWalletMock).not.toHaveBeenCalled();
  });
});
