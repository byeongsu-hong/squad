export type WalletConnectNamespace = "eip155" | "solana";

type ModalCloseCallback = () => void;
type ModalCloseUnsubscribe = () => void;

async function loadAppKitControllers() {
  return import("@reown/appkit-controllers");
}

export async function prepareWalletConnectModalState(
  namespace: WalletConnectNamespace
) {
  if (typeof window === "undefined") return;

  try {
    const { ChainController, ConnectionController, ModalController } =
      await loadAppKitControllers();

    ModalController.close();
    ModalController.clearLoading();
    ConnectionController.resetWcConnection();
    ChainController.setActiveNamespace(namespace);
  } catch {
    // AppKit is a best-effort UI layer; connector errors still surface normally.
  }
}

export async function subscribeWalletConnectModalClose(
  callback: ModalCloseCallback
): Promise<ModalCloseUnsubscribe> {
  if (typeof window === "undefined") return () => undefined;

  try {
    const { ModalController } = await loadAppKitControllers();
    return ModalController.subscribeKey("open", (open) => {
      if (!open) callback();
    });
  } catch {
    return () => undefined;
  }
}
