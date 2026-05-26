import { describe, expect, it } from "vitest";

import {
  type ErrorPattern,
  formatError,
  getErrorMessage,
  matchErrorPattern,
} from "@/lib/error-handler";

describe("error-handler", () => {
  const testPatterns: ErrorPattern[] = [
    {
      keywords: ["rate limit", "429"],
      message: "Rate limit exceeded",
      duration: 3000,
    },
    {
      keywords: ["not found"],
      message: "Resource not found",
      duration: 4000,
    },
  ];

  describe("matchErrorPattern", () => {
    it("should match error by keyword", () => {
      const error = new Error("API rate limit exceeded");
      const pattern = matchErrorPattern(error, testPatterns);

      expect(pattern).not.toBeNull();
      expect(pattern?.message).toBe("Rate limit exceeded");
    });

    it("should match error by status code", () => {
      const error = new Error("Request failed with status 429");
      const pattern = matchErrorPattern(error, testPatterns);

      expect(pattern).not.toBeNull();
      expect(pattern?.message).toBe("Rate limit exceeded");
    });

    it("should be case insensitive", () => {
      const error = new Error("RATE LIMIT EXCEEDED");
      const pattern = matchErrorPattern(error, testPatterns);

      expect(pattern).not.toBeNull();
      expect(pattern?.message).toBe("Rate limit exceeded");
    });

    it("should return null when no pattern matches", () => {
      const error = new Error("Unknown error");
      const pattern = matchErrorPattern(error, testPatterns);

      expect(pattern).toBeNull();
    });

    it("should handle string errors", () => {
      const error = "Resource not found";
      const pattern = matchErrorPattern(error, testPatterns);

      expect(pattern).not.toBeNull();
      expect(pattern?.message).toBe("Resource not found");
    });
  });

  describe("formatError", () => {
    it("should format Error objects", () => {
      const error = new Error("Test error");
      expect(formatError(error)).toBe("Test error");
    });

    it("should format string errors", () => {
      expect(formatError("String error")).toBe("String error");
    });

    it("should format unknown errors", () => {
      expect(formatError({ unknown: true })).toBe("An unknown error occurred");
    });
  });

  describe("getErrorMessage", () => {
    it("should return matched pattern message", () => {
      const error = new Error("Rate limit exceeded");
      const result = getErrorMessage(error, testPatterns);

      expect(result.message).toBe("Rate limit exceeded");
      expect(result.duration).toBe(3000);
    });

    it("should return formatted error when no pattern matches", () => {
      const error = new Error("Custom error");
      const result = getErrorMessage(error, testPatterns);

      expect(result.message).toBe("Custom error");
      expect(result.duration).toBe(5000);
    });
  });
});
