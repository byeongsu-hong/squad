interface StorageAdapter<T, S = T> {
  serialize: (data: T) => S;
  deserialize: (data: S) => T;
}

export function createStorage<T, S = T>(
  key: string,
  adapter?: StorageAdapter<T, S>
) {
  const isServer = typeof window === "undefined";

  return {
    get(): T | null {
      if (isServer) return null;
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return adapter ? adapter.deserialize(parsed) : parsed;
      } catch (error) {
        // Handle legacy non-JSON values
        const stored = localStorage.getItem(key);
        if (stored && !stored.startsWith("{") && !stored.startsWith("[")) {
          // If it looks like a plain string and no adapter is needed, return it as-is
          if (!adapter) {
            console.warn(
              `Migrating legacy storage value for ${key} from plain string to JSON`
            );
            // Migrate to JSON format
            localStorage.setItem(key, JSON.stringify(stored));
            return stored as T;
          }
        }
        console.error(`Failed to load ${key}:`, error);
        // Clear corrupted data
        localStorage.removeItem(key);
        return null;
      }
    },

    set(value: T): void {
      if (isServer) return;
      try {
        const data = adapter ? adapter.serialize(value) : value;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error(`Failed to save ${key}:`, error);
      }
    },

    remove(): void {
      if (isServer) return;
      localStorage.removeItem(key);
    },
  };
}

export function createListStorage<T, S = T>(
  key: string,
  adapter?: StorageAdapter<T, S>
) {
  const baseStorage = createStorage<T[], S[]>(
    key,
    adapter
      ? {
          serialize: (items) => items.map(adapter.serialize),
          deserialize: (items) => items.map(adapter.deserialize),
        }
      : undefined
  );

  return {
    getAll(): T[] {
      return baseStorage.get() || [];
    },

    save(items: T[]): void {
      baseStorage.set(items);
    },

    add(item: T): void {
      const items = this.getAll();
      items.push(item);
      this.save(items);
    },

    update(predicate: (item: T) => boolean, updates: Partial<T>): void {
      const items = this.getAll().map((item) =>
        predicate(item) ? { ...item, ...updates } : item
      );
      this.save(items);
    },

    remove(predicate: (item: T) => boolean): void {
      const items = this.getAll().filter((item) => !predicate(item));
      this.save(items);
    },

    find(predicate: (item: T) => boolean): T | undefined {
      return this.getAll().find(predicate);
    },
  };
}
