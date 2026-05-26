import { PublicKey } from "@solana/web3.js";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWalletStore } from "@/stores/wallet-store";
import { WalletType } from "@/types/wallet";

import { WalletSync } from "./wallet-sync";

const walletMock = vi.hoisted(() => ({
  connected: false,
  wallets: [] as Array<{ adapter: { name: string } }>,
  select: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => walletMock,
}));

describe("WalletSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletMock.connected = false;
    walletMock.wallets = [];
    walletMock.select.mockReset();
    walletMock.connect.mockReset();
    walletMock.connect.mockResolvedValue(undefined);
    useWalletStore.setState({
      connected: false,
      publicKey: null,
      walletType: null,
      walletName: undefined,
      derivationPath: undefined,
      deviceModel: undefined,
    });
  });

  it("attempts browser-wallet auto reconnect only once while disconnected", async () => {
    walletMock.wallets = [{ adapter: { name: "Phantom" } }];
    useWalletStore.setState({
      connected: true,
      publicKey: new PublicKey("3c5oFeqTRDXUkTcaxCMS2jsHWAkvUi4treoMBCP1aUPo"),
      walletType: WalletType.BROWSER,
      walletName: "Phantom",
    });

    const { rerender } = render(<WalletSync />);
    walletMock.wallets = [{ adapter: { name: "Phantom" } }];
    rerender(<WalletSync />);
    walletMock.wallets = [{ adapter: { name: "Phantom" } }];
    rerender(<WalletSync />);

    expect(walletMock.select).toHaveBeenCalledTimes(1);
    expect(walletMock.select).toHaveBeenCalledWith("Phantom");

    await vi.advanceTimersByTimeAsync(100);

    expect(walletMock.connect).toHaveBeenCalledTimes(1);

    rerender(<WalletSync />);
    await vi.advanceTimersByTimeAsync(500);

    expect(walletMock.select).toHaveBeenCalledTimes(1);
    expect(walletMock.connect).toHaveBeenCalledTimes(1);
  });

  it("does not reconnect when the stored wallet is unavailable", async () => {
    walletMock.wallets = [{ adapter: { name: "Solflare" } }];
    useWalletStore.setState({
      connected: true,
      publicKey: new PublicKey("3c5oFeqTRDXUkTcaxCMS2jsHWAkvUi4treoMBCP1aUPo"),
      walletType: WalletType.BROWSER,
      walletName: "Phantom",
    });

    render(<WalletSync />);
    await vi.advanceTimersByTimeAsync(500);

    expect(walletMock.select).not.toHaveBeenCalled();
    expect(walletMock.connect).not.toHaveBeenCalled();
  });
});
