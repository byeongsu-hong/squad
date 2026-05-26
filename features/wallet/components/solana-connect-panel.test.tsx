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
const waitForWalletConnectHostReleaseMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
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

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock("../lib/walletconnect-appkit", () => ({
  prepareWalletConnectModalState: prepareWalletConnectModalStateMock,
  subscribeWalletConnectModalClose: subscribeWalletConnectModalCloseMock,
  waitForWalletConnectHostRelease: waitForWalletConnectHostReleaseMock,
}));

describe("SolanaConnectPanel", () => {
  beforeEach(() => {
    connectBrowserWalletMock.mockClear();
    toastErrorMock.mockClear();
    toastSuccessMock.mockClear();
    prepareWalletConnectModalStateMock.mockReset();
    prepareWalletConnectModalStateMock.mockResolvedValue(undefined);
    waitForWalletConnectHostReleaseMock.mockReset();
    waitForWalletConnectHostReleaseMock.mockResolvedValue(undefined);
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

  it("closes the app dialog before opening the official SVM WalletConnect modal", async () => {
    browserWalletState.installedWallets = [walletConnectWallet];
    const events: string[] = [];
    const onClose = vi.fn(() => events.push("close"));
    prepareWalletConnectModalStateMock.mockImplementation(async () => {
      events.push("prepare");
    });
    connectBrowserWalletMock.mockImplementation(() => {
      events.push("connect");
      return Promise.resolve();
    });

    render(<SolanaConnectPanel onClose={onClose} onOpenLedger={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /WalletConnect/ }));

    await waitFor(() => expect(connectBrowserWalletMock).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(waitForWalletConnectHostReleaseMock).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["prepare", "close", "connect"]);
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

  it("does not surface WalletConnect modal close as a connection failure", async () => {
    browserWalletState.installedWallets = [walletConnectWallet];
    const closedError = Object.assign(new Error("Wallet window closed"), {
      name: "WalletWindowClosedError",
    });
    connectBrowserWalletMock.mockRejectedValue(closedError);

    render(<SolanaConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    const walletConnectButton = screen.getByRole("button", {
      name: /WalletConnect/,
    });
    fireEvent.click(walletConnectButton);

    await waitFor(() =>
      expect(connectBrowserWalletMock).toHaveBeenCalledWith(walletConnectWallet)
    );

    expect(screen.queryByText("Wallet window closed")).toBeNull();
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(walletConnectButton.disabled).toBe(false);
  });

  it("asks the host dialog to restore when SVM WalletConnect is cancelled", async () => {
    browserWalletState.installedWallets = [walletConnectWallet];
    const onBeginWalletConnect = vi.fn();
    const onEndWalletConnect = vi.fn();
    const closedError = Object.assign(new Error("Wallet window closed"), {
      name: "WalletWindowClosedError",
    });
    connectBrowserWalletMock.mockRejectedValue(closedError);

    render(
      <SolanaConnectPanel
        onClose={vi.fn()}
        onOpenLedger={vi.fn()}
        onBeginWalletConnect={onBeginWalletConnect}
        onEndWalletConnect={onEndWalletConnect}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /WalletConnect/ }));

    await waitFor(() =>
      expect(onEndWalletConnect).toHaveBeenCalledWith({ reopen: true })
    );
    expect(onBeginWalletConnect).toHaveBeenCalledTimes(1);
  });
});
