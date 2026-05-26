import { render, screen } from "@testing-library/react";
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

  it("shows EVM Ledger with the Ethereum derivation path even without WalletConnect", () => {
    render(<EvmConnectPanel onClose={vi.fn()} />);

    expect(screen.getByText("Ledger")).toBeTruthy();
    expect(screen.getByText("Ledger Live · m/44'/60'/0'/0/n")).toBeTruthy();
  });
});
