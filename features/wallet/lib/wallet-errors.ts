const CANCELLATION_ERROR_NAMES = new Set([
  "UserRejectedRequestError",
  "WalletWindowClosedError",
]);

const CANCELLATION_MESSAGE_PARTS = [
  "cancelled",
  "canceled",
  "connection request reset",
  "rejected",
  "wallet window closed",
];

function getErrorName(error: unknown) {
  return error instanceof Error
    ? error.name
    : typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : typeof error === "string"
        ? error
        : "";
}

export function isWalletConnectionCancellation(error: unknown) {
  const name = getErrorName(error);
  if (CANCELLATION_ERROR_NAMES.has(name)) return true;

  const message = getErrorMessage(error).toLowerCase();
  return CANCELLATION_MESSAGE_PARTS.some((part) => message.includes(part));
}
