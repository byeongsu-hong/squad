import { beforeEach, describe, expect, it, vi } from "vitest";

import { createListStorage, createStorage } from "@/lib/storage-base";

describe("storage-base", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("createStorage", () => {
    it("should store and retrieve simple values", () => {
      const storage = createStorage<string>("test-key");

      storage.set("test-value");
      expect(storage.get()).toBe("test-value");
    });

    it("should return null for non-existent keys", () => {
      const storage = createStorage<string>("non-existent");
      expect(storage.get()).toBeNull();
    });

    it("should remove values", () => {
      const storage = createStorage<string>("test-key");

      storage.set("test-value");
      storage.remove();
      expect(storage.get()).toBeNull();
    });

    it("should handle objects", () => {
      const storage = createStorage<{ name: string; age: number }>("test-obj");

      storage.set({ name: "John", age: 30 });
      expect(storage.get()).toEqual({ name: "John", age: 30 });
    });

    it("should use custom adapter for serialization", () => {
      interface User {
        id: number;
        name: string;
      }

      const storage = createStorage<User, string>("test-user", {
        serialize: (user) => `${user.id}:${user.name}`,
        deserialize: (str) => {
          const [id, name] = str.split(":");
          return { id: Number(id), name };
        },
      });

      storage.set({ id: 1, name: "Alice" });
      expect(localStorage.getItem("test-user")).toBe(JSON.stringify("1:Alice"));
      expect(storage.get()).toEqual({ id: 1, name: "Alice" });
    });

    it("should handle legacy plain string values without adapter", () => {
      const storage = createStorage<string>("test-legacy");

      // Simulate legacy storage where value was stored without JSON.stringify
      localStorage.setItem("test-legacy", "EvptYJrjGUplainValue123");

      // Should migrate and return the value
      const result = storage.get();
      expect(result).toBe("EvptYJrjGUplainValue123");

      // Should have migrated to JSON format
      expect(localStorage.getItem("test-legacy")).toBe(
        JSON.stringify("EvptYJrjGUplainValue123")
      );
    });

    it("should clear corrupted storage with adapter", () => {
      interface Data {
        value: string;
      }

      const storage = createStorage<Data>("test-corrupted", {
        serialize: (d) => d,
        deserialize: (d) => d,
      });

      // Store corrupted data (plain string instead of object)
      localStorage.setItem("test-corrupted", "invalidData");

      // Should return null and clear corrupted data
      const result = storage.get();
      expect(result).toBeNull();
      expect(localStorage.getItem("test-corrupted")).toBeNull();
    });

    it("should clear corrupted JSON objects", () => {
      const storage = createStorage<{ name: string }>("test-invalid-json");

      // Store invalid JSON
      localStorage.setItem("test-invalid-json", "{invalid json}");

      // Should return null and clear corrupted data
      const result = storage.get();
      expect(result).toBeNull();
      expect(localStorage.getItem("test-invalid-json")).toBeNull();
    });
  });

  describe("createListStorage", () => {
    it("should store and retrieve arrays", () => {
      const storage = createListStorage<string>("test-list");

      storage.save(["a", "b", "c"]);
      expect(storage.getAll()).toEqual(["a", "b", "c"]);
    });

    it("should return empty array for non-existent keys", () => {
      const storage = createListStorage<string>("non-existent");
      expect(storage.getAll()).toEqual([]);
    });

    it("should add items", () => {
      const storage = createListStorage<string>("test-list");

      storage.save(["a", "b"]);
      storage.add("c");
      expect(storage.getAll()).toEqual(["a", "b", "c"]);
    });

    it("should update items", () => {
      interface Item {
        id: number;
        name: string;
      }

      const storage = createListStorage<Item>("test-items");

      storage.save([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);

      storage.update((item) => item.id === 1, { name: "Updated Item 1" });

      expect(storage.getAll()).toEqual([
        { id: 1, name: "Updated Item 1" },
        { id: 2, name: "Item 2" },
      ]);
    });

    it("should remove items", () => {
      const storage = createListStorage<number>("test-numbers");

      storage.save([1, 2, 3, 4, 5]);
      storage.remove((n) => n % 2 === 0);

      expect(storage.getAll()).toEqual([1, 3, 5]);
    });

    it("should find items", () => {
      const storage = createListStorage<number>("test-numbers");

      storage.save([1, 2, 3, 4, 5]);

      expect(storage.find((n) => n === 3)).toBe(3);
      expect(storage.find((n) => n === 10)).toBeUndefined();
    });
  });
});
