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

describe("EvmConnectPanel", () => {
  beforeEach(() => {
    connectMock.mockClear();
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

  it("opens WalletConnect through the wagmi connector so its official modal owns the flow", () => {
    connectorsMock.value = [walletConnectConnector];

    render(<EvmConnectPanel onClose={vi.fn()} onOpenLedger={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /WalletConnect/ }));

    expect(connectMock).toHaveBeenCalledWith(
      { connector: walletConnectConnector },
      expect.any(Object)
    );
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
