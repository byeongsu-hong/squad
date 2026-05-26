import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Connector } from "wagmi";

import { EvmConnectPanel } from "./evm-connect-panel";

const connectMock = vi.hoisted(() => vi.fn());
const connectorsMock = vi.hoisted(() => ({
  value: [] as Connector[],
}));

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
      variables: undefined,
    }),
  };
});

vi.mock("../hooks/use-wc-uri", () => ({
  useWcUri: () => ({
    clearUri: vi.fn(),
    uri: null,
  }),
}));

vi.mock("./wc-qr-modal", () => ({
  WcQrModal: () => null,
}));

describe("EvmConnectPanel", () => {
  beforeEach(() => {
    connectMock.mockClear();
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
});
