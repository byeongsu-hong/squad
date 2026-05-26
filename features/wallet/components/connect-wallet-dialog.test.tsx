import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectWalletDialog } from "./connect-wallet-dialog";

const mockPanelState = vi.hoisted(() => ({
  evmEndReopen: true as boolean | null,
}));

type MockPanelProps = {
  onBeginWalletConnect?: () => Promise<void> | void;
  onClose: () => void;
  onEndWalletConnect?: (result: { reopen: boolean }) => void;
};

vi.mock("../lib/walletconnect-appkit", () => ({
  subscribeWalletConnectModalClose: vi.fn(async () => vi.fn()),
}));

vi.mock("./evm-connect-panel", () => ({
  EvmConnectPanel: (props: MockPanelProps) => (
    <button
      type="button"
      onClick={async () => {
        if (props.onBeginWalletConnect) {
          await props.onBeginWalletConnect();
        } else {
          props.onClose();
        }
        if (mockPanelState.evmEndReopen !== null) {
          await new Promise((resolve) => window.setTimeout(resolve, 0));
          props.onEndWalletConnect?.({ reopen: mockPanelState.evmEndReopen });
        }
      }}
    >
      Mock EVM WalletConnect
    </button>
  ),
}));

vi.mock("./solana-connect-panel", () => ({
  SolanaConnectPanel: () => <button type="button">Mock Solana Panel</button>,
}));

vi.mock("./ledger-connect-panel", () => ({
  LedgerConnectPanel: () => <div>Mock Solana Ledger</div>,
}));

vi.mock("./evm-ledger-connect-panel", () => ({
  EvmLedgerConnectPanel: () => <div>Mock EVM Ledger</div>,
}));

function DialogHarness({
  defaultTab = "ethereum",
}: {
  defaultTab?: "solana" | "ethereum";
}) {
  const [open, setOpen] = useState(true);

  return (
    <ConnectWalletDialog
      open={open}
      onOpenChange={setOpen}
      defaultTab={defaultTab}
    />
  );
}

describe("ConnectWalletDialog", () => {
  beforeEach(() => {
    mockPanelState.evmEndReopen = true;
  });

  it("restores the same tab when WalletConnect is dismissed", async () => {
    render(<DialogHarness defaultTab="solana" />);

    fireEvent.click(screen.getByRole("tab", { name: "Ethereum" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Mock EVM WalletConnect" })
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Mock EVM WalletConnect" })
      ).toBeNull()
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Mock EVM WalletConnect" })
      ).toBeTruthy()
    );
    expect(
      screen
        .getByRole("tab", { name: "Ethereum" })
        .getAttribute("aria-selected")
    ).toBe("true");
  });

  it("keeps the wallet dialog closed after WalletConnect succeeds", async () => {
    mockPanelState.evmEndReopen = false;

    render(<DialogHarness defaultTab="ethereum" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Mock EVM WalletConnect" })
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Mock EVM WalletConnect" })
      ).toBeNull()
    );
  });
});
