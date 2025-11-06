import { describe, expect, it } from "vitest";

import { validatePublicKey, validateSolAmount } from "@/lib/validation";

describe("validatePublicKey", () => {
  it("should accept valid Solana public keys", () => {
    expect(validatePublicKey("11111111111111111111111111111111")).toBe(true);
    expect(
      validatePublicKey("So11111111111111111111111111111111111111112")
    ).toBe(true);
  });

  it("should reject invalid public keys", () => {
    expect(validatePublicKey("invalid")).toBe(false);
    expect(validatePublicKey("")).toBe(false);
    expect(validatePublicKey("123")).toBe(false);
  });

  it("should reject non-base58 characters", () => {
    expect(validatePublicKey("0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O")).toBe(
      false
    );
  });
});

describe("validateSolAmount", () => {
  it("should accept valid SOL amounts", () => {
    expect(validateSolAmount("1")).toBe(true);
    expect(validateSolAmount("0.5")).toBe(true);
    expect(validateSolAmount("100.123456789")).toBe(true);
    expect(validateSolAmount("1000000")).toBe(true);
  });

  it("should reject invalid amounts", () => {
    expect(validateSolAmount("0")).toBe(false);
    expect(validateSolAmount("-1")).toBe(false);
    expect(validateSolAmount("abc")).toBe(false);
    expect(validateSolAmount("")).toBe(false);
  });

  it("should reject amounts exceeding maximum", () => {
    expect(validateSolAmount("1000000000")).toBe(false);
    expect(validateSolAmount("99999999999")).toBe(false);
  });

  it("should handle edge cases", () => {
    expect(validateSolAmount("0.000000001")).toBe(true);
    expect(validateSolAmount("999999999")).toBe(true);
  });
});
