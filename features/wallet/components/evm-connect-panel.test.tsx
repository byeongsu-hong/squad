import { fireEvent, render, screen } from "@testing-library/react";
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
const wcUriMock = vi.hoisted(() => ({
  clearUri: vi.fn(),
  value: null as string | null,
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

vi.mock("../hooks/use-wc-uri", () => ({
  useWcUri: () => ({
    clearUri: wcUriMock.clearUri,
    uri: wcUriMock.value,
  }),
}));

vi.mock("./wc-qr-modal", () => ({
  WcQrModal: ({ uri, onClose }: { uri: string | null; onClose: () => void }) =>
    uri ? (
      <button type="button" onClick={onClose}>
        Close WalletConnect QR
      </button>
    ) : null,
}));

describe("EvmConnectPanel", () => {
  beforeEach(() => {
    connectMock.mockClear();
    connectVariablesMock.value = undefined;
    connectorsMock.value = [];
    wcUriMock.clearUri.mockClear();
    wcUriMock.value = null;
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

  it("does not keep the EVM WalletConnect row stuck after the QR modal closes", () => {
    connectorsMock.value = [walletConnectConnector];
    connectVariablesMock.value = { connector: walletConnectConnector };
    wcUriMock.value = "wc:pending-uri";

    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Close WalletConnect QR/ })
    );

    expect(wcUriMock.clearUri).toHaveBeenCalledTimes(1);
    const walletConnectButton = screen
      .getAllByRole("button")
      .find((button) =>
        /Scan QR with any mobile wallet/.test(button.textContent ?? "")
      );

    expect(walletConnectButton).toBeTruthy();
    expect((walletConnectButton as HTMLButtonElement).disabled).toBe(false);
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
