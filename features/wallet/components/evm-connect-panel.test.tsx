import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Connector } from "wagmi";

import { EvmConnectPanel } from "./evm-connect-panel";

const connectMock = vi.hoisted(() => vi.fn());
const connectorsMock = vi.hoisted(() => ({
  value: [] as Connector[],
}));
const connectVariablesMock = vi.hoisted(() => ({
  value: undefined as { connector?: Connector } | undefined,
}));
const prepareWalletConnectModalStateMock = vi.hoisted(() => vi.fn());
const subscribeWalletConnectModalCloseMock = vi.hoisted(() => vi.fn());
const waitForWalletConnectHostReleaseMock = vi.hoisted(() => vi.fn());
const modalCloseCallbacks = vi.hoisted(() => ({
  value: [] as Array<() => void>,
}));
const okxConnector = {
  icon: null,
  id: "okxWallet",
  name: "OKX Wallet",
  type: "injected",
} as Connector;

const metaMaskConnector = {
  icon: null,
  id: "io.metamask",
  name: "MetaMask",
  type: "injected",
} as Connector;

const walletConnectConnector = {
  icon: null,
  id: "walletConnect",
  name: "WalletConnect",
  type: "walletConnect",
} as Connector;

vi.mock("wagmi", async (importActual) => {
  const actual = await importActual<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => ({
      address: undefined,
      connector: undefined,
      isConnected: false,
    }),
    useConnect: () => ({
      connect: connectMock,
      connectors: connectorsMock.value,
      variables: connectVariablesMock.value,
    }),
  };
});

vi.mock("../lib/walletconnect-appkit", () => ({
  prepareWalletConnectModalState: prepareWalletConnectModalStateMock,
  subscribeWalletConnectModalClose: subscribeWalletConnectModalCloseMock,
  waitForWalletConnectHostRelease: waitForWalletConnectHostReleaseMock,
}));

describe("EvmConnectPanel", () => {
  beforeEach(() => {
    connectMock.mockClear();
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
    connectVariablesMock.value = undefined;
    connectorsMock.value = [];
  });

  it("shows EVM Ledger USB as a separate option from WalletConnect", () => {
    const onOpenLedger = vi.fn();

    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={onOpenLedger} />);

    const ledgerButton = screen.getByRole("button", {
      name: /Ledger USB.*m\/44'\/60'\/0'\/0\/0/,
    });

    expect(ledgerButton).toBeTruthy();
    expect(screen.queryByText(/Ledger Live/)).toBeNull();
    expect(screen.getByRole("button", { name: /WalletConnect/ })).toBeTruthy();

    fireEvent.click(ledgerButton);

    expect(onOpenLedger).toHaveBeenCalledTimes(1);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("keeps WalletConnect visible and explains missing configuration", () => {
    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /WalletConnect/ }));

    expect(
      screen.getByText("WalletConnect project id is not configured.")
    ).toBeTruthy();
    expect(connectMock).not.toHaveBeenCalled();
  });

  it("does not render an app-owned QR modal for EVM WalletConnect", () => {
    connectorsMock.value = [walletConnectConnector];

    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: /Close WalletConnect QR/ })
    ).toBeNull();
  });

  it("opens WalletConnect through the wagmi connector so its official modal owns the flow", async () => {
    connectorsMock.value = [walletConnectConnector];

    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /WalletConnect/ }));

    await waitFor(() =>
      expect(prepareWalletConnectModalStateMock).toHaveBeenCalledWith("eip155")
    );
    expect(connectMock).toHaveBeenCalledWith(
      { connector: walletConnectConnector },
      expect.any(Object)
    );
  });

  it("closes the app dialog before opening the official WalletConnect modal", async () => {
    connectorsMock.value = [walletConnectConnector];
    const events: string[] = [];
    const onClose = vi.fn(() => events.push("close"));
    prepareWalletConnectModalStateMock.mockImplementation(async () => {
      events.push("prepare");
    });
    connectMock.mockImplementation(() => {
      events.push("connect");
    });

    render(<EvmConnectPanel onClose={onClose} onOpenLedger={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /WalletConnect/ }));

    await waitFor(() => expect(connectMock).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(waitForWalletConnectHostReleaseMock).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["prepare", "close", "connect"]);
  });

  it("clears WalletConnect loading if the official modal is closed before connection completes", async () => {
    connectorsMock.value = [walletConnectConnector];

    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

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

  it("asks the host dialog to restore when WalletConnect is cancelled", async () => {
    connectorsMock.value = [walletConnectConnector];
    const events: string[] = [];
    const onBeginWalletConnect = vi.fn(() => events.push("begin"));
    const onEndWalletConnect = vi.fn((result: { reopen: boolean }) => {
      events.push(`end:${result.reopen}`);
    });
    connectMock.mockImplementation((...args: unknown[]) => {
      events.push("connect");
      const options = args[1] as { onError: (error: Error) => void };
      options.onError(
        Object.assign(new Error("Wallet window closed"), {
          name: "WalletWindowClosedError",
        })
      );
    });

    render(
      <EvmConnectPanel
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
    expect(events).toEqual(["begin", "connect", "end:true"]);
  });

  it("keeps OKX in More options instead of the inline browser wallet section", () => {
    connectorsMock.value = [
      metaMaskConnector,
      okxConnector,
      walletConnectConnector,
    ];

    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    const buttons = screen
      .getAllByRole("button")
      .map((button) => button.textContent ?? "");
    const metaMaskIndex = buttons.findIndex((text) => /MetaMask/.test(text));
    const ledgerIndex = buttons.findIndex((text) => /Ledger USB/.test(text));
    const okxIndex = buttons.findIndex((text) => /OKX Wallet/.test(text));
    const wcIndex = buttons.findIndex((text) => /WalletConnect/.test(text));

    expect(metaMaskIndex).toBeGreaterThanOrEqual(0);
    expect(ledgerIndex).toBeGreaterThanOrEqual(0);
    expect(okxIndex).toBeGreaterThanOrEqual(0);
    expect(wcIndex).toBeGreaterThanOrEqual(0);
    expect(okxIndex).toBeGreaterThan(ledgerIndex);
    expect(okxIndex).toBeLessThan(wcIndex);
  });
});
