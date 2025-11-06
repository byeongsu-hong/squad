/**
 * Formats a Solana address for display
 * @param address - The full address string
 * @param startChars - Number of characters to show at the start
 * @param endChars - Number of characters to show at the end
 * @returns Formatted address string
 */
export function formatAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Validates if a string is a valid Solana address format
 * @param address - The address to validate
 * @returns True if valid format
 */
export function isValidAddress(address: string): boolean {
  // Solana addresses are base58 encoded 32-byte arrays
  // They typically are 32-44 characters long
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}
