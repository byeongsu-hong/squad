import { beforeEach, describe, expect, it, vi } from "vitest";

import { cache } from "@/lib/cache";

describe("Cache", () => {
  beforeEach(() => {
    cache.clear();
    vi.clearAllTimers();
  });

  it("should store and retrieve data", () => {
    const key = "test-key";
    const data = { value: "test-data" };

    cache.set(key, data);
    const result = cache.get(key);

    expect(result).toEqual(data);
  });

  it("should return null for non-existent key", () => {
    const result = cache.get("non-existent");
    expect(result).toBeNull();
  });

  it("should expire data after TTL", () => {
    vi.useFakeTimers();
    const key = "test-key";
    const data = { value: "test-data" };
    const ttl = 1000; // 1 second

    cache.set(key, data, ttl);

    // Data should exist before TTL
    expect(cache.get(key)).toEqual(data);

    // Fast forward time past TTL
    vi.advanceTimersByTime(ttl + 1);

    // Data should be expired
    expect(cache.get(key)).toBeNull();

    vi.useRealTimers();
  });

  it("should invalidate specific key", () => {
    const key = "test-key";
    const data = { value: "test-data" };

    cache.set(key, data);
    expect(cache.get(key)).toEqual(data);

    cache.invalidate(key);
    expect(cache.get(key)).toBeNull();
  });

  it("should invalidate by pattern", () => {
    cache.set("user:1:profile", { name: "User 1" });
    cache.set("user:2:profile", { name: "User 2" });
    cache.set("post:1", { title: "Post 1" });

    cache.invalidatePattern("user:");

    expect(cache.get("user:1:profile")).toBeNull();
    expect(cache.get("user:2:profile")).toBeNull();
    expect(cache.get("post:1")).toEqual({ title: "Post 1" });
  });

  it("should check if key exists", () => {
    vi.useFakeTimers();
    const key = "test-key";
    const data = { value: "test-data" };
    const ttl = 1000;

    expect(cache.has(key)).toBe(false);

    cache.set(key, data, ttl);
    expect(cache.has(key)).toBe(true);

    vi.advanceTimersByTime(ttl + 1);
    expect(cache.has(key)).toBe(false);

    vi.useRealTimers();
  });

  it("should clear all data", () => {
    cache.set("key1", { value: "data1" });
    cache.set("key2", { value: "data2" });
    cache.set("key3", { value: "data3" });

    cache.clear();

    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
    expect(cache.get("key3")).toBeNull();
  });

  it("should use default TTL when not specified", () => {
    vi.useFakeTimers();
    const key = "test-key";
    const data = { value: "test-data" };

    cache.set(key, data);

    // Should exist before default TTL (30 seconds)
    vi.advanceTimersByTime(29000);
    expect(cache.get(key)).toEqual(data);

    // Should expire after default TTL
    vi.advanceTimersByTime(2000);
    expect(cache.get(key)).toBeNull();

    vi.useRealTimers();
  });

  it("should handle multiple types of data", () => {
    cache.set("string", "test");
    cache.set("number", 42);
    cache.set("boolean", true);
    cache.set("array", [1, 2, 3]);
    cache.set("object", { a: 1, b: 2 });

    expect(cache.get("string")).toBe("test");
    expect(cache.get("number")).toBe(42);
    expect(cache.get("boolean")).toBe(true);
    expect(cache.get("array")).toEqual([1, 2, 3]);
    expect(cache.get("object")).toEqual({ a: 1, b: 2 });
  });
});
