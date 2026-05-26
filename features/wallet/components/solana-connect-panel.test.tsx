import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SolanaConnectPanel } from "./solana-connect-panel";

const connectBrowserWalletMock = vi.hoisted(() => vi.fn());
const browserWalletState = vi.hoisted(() => ({
  installedWallets: [] as unknown[],
  availableWallets: [] as unknown[],
}));
const prepareWalletConnectModalStateMock = vi.hoisted(() => vi.fn());
const subscribeWalletConnectModalCloseMock = vi.hoisted(() => vi.fn());
const modalCloseCallbacks = vi.hoisted(() => ({
  value: [] as Array<() => void>,
}));

const walletConnectWallet = {
  adapter: {
    icon: null,
    name: "WalletConnect",
    url: "https://walletconnect.com",
  },
};

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

vi.mock("../lib/walletconnect-appkit", () => ({
  prepareWalletConnectModalState: prepareWalletConnectModalStateMock,
  subscribeWalletConnectModalClose: subscribeWalletConnectModalCloseMock,
}));

describe("SolanaConnectPanel", () => {
  beforeEach(() => {
    connectBrowserWalletMock.mockClear();
    prepareWalletConnectModalStateMock.mockReset();
    prepareWalletConnectModalStateMock.mockResolvedValue(undefined);
    subscribeWalletConnectModalCloseMock.mockReset();
    subscribeWalletConnectModalCloseMock.mockImplementation(
      async (callback: () => void) => {
        modalCloseCallbacks.value.push(callback);
        return vi.fn();
      }
    );
    modalCloseCallbacks.value = [];
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

  it("opens SVM WalletConnect even when the adapter is classified as installed", async () => {
    browserWalletState.installedWallets = [walletConnectWallet];

    render(<SolanaConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    const walletConnectButtons = screen.getAllByRole("button", {
      name: /WalletConnect/,
    });

    expect(walletConnectButtons).toHaveLength(1);
    fireEvent.click(walletConnectButtons[0]);

    await waitFor(() =>
      expect(prepareWalletConnectModalStateMock).toHaveBeenCalledWith("solana")
    );
    expect(connectBrowserWalletMock).toHaveBeenCalledWith(walletConnectWallet);
  });

  it("clears WalletConnect loading if the official modal is closed before connection completes", async () => {
    browserWalletState.installedWallets = [walletConnectWallet];
    connectBrowserWalletMock.mockReturnValue(new Promise(() => {}));

    render(<SolanaConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    const walletConnectButton = screen.getByRole("button", {
      name: /WalletConnect/,
    });
    fireEvent.click(walletConnectButton);

    await waitFor(() => expect(walletConnectButton.disabled).toBe(true));
    await waitFor(() =>
      expect(subscribeWalletConnectModalCloseMock).toHaveBeenCalled()
    );

    act(() => {
      modalCloseCallbacks.value[0]?.();
    });

    expect(walletConnectButton.disabled).toBe(false);
  });
});
