import { describe, expect, it } from "vitest";

import { formatAddress, isValidAddress } from "@/lib/utils/format-address";

describe("formatAddress", () => {
  const testAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

  it("should format address with default parameters", () => {
    const result = formatAddress(testAddress);
    expect(result).toBe("7xKX...gAsU");
  });

  it("should format address with custom start and end chars", () => {
    const result = formatAddress(testAddress, 6, 6);
    expect(result).toBe("7xKXtg...osgAsU");
  });

  it("should return full address if shorter than truncation length", () => {
    const shortAddress = "1234567";
    const result = formatAddress(shortAddress, 4, 4);
    expect(result).toBe(shortAddress);
  });

  it("should handle single character start and end", () => {
    const result = formatAddress(testAddress, 1, 1);
    expect(result).toBe("7...U");
  });
});

describe("isValidAddress", () => {
  it("should validate correct Solana address", () => {
    const validAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    expect(isValidAddress(validAddress)).toBe(true);
  });

  it("should reject address with invalid characters", () => {
    const invalidAddress = "0OIl7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRu";
    expect(isValidAddress(invalidAddress)).toBe(false);
  });

  it("should reject too short address", () => {
    const shortAddress = "7xKXtg";
    expect(isValidAddress(shortAddress)).toBe(false);
  });

  it("should reject too long address", () => {
    const longAddress =
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsUTooLong123";
    expect(isValidAddress(longAddress)).toBe(false);
  });

  it("should reject empty string", () => {
    expect(isValidAddress("")).toBe(false);
  });
});
