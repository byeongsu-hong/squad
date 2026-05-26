export type RequestBrokerDegradedReason =
  | {
      kind: "fallback";
      chainId: string;
      key: string;
      failedEndpoint: string;
      endpoint: string;
      message: string;
    }
  | {
      kind: "stale";
      chainId: string;
      key: string;
      message: string;
    };

export interface RequestBrokerResult<T> {
  data: T;
  endpoint: string | null;
  stale: boolean;
  degradedReason?: RequestBrokerDegradedReason;
}

interface RequestBrokerOptions {
  defaultConcurrency?: number;
  onDegraded?: (reason: RequestBrokerDegradedReason) => void;
}

interface RequestBrokerFetchOptions<T> {
  key: string;
  chainId: string;
  endpoints: string[];
  request: (endpoint: string, endpointIndex: number) => Promise<T>;
  ttlMs?: number;
  concurrency?: number;
  allowStaleOnError?: boolean;
}

interface BrokerCacheEntry<T> {
  data: T;
  endpoint: string;
  timestamp: number;
  ttlMs: number;
}

class ChainLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private concurrency: number) {}

  setConcurrency(concurrency: number) {
    this.concurrency = Math.max(1, concurrency);
    this.drain();
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire() {
    if (this.active < this.concurrency) {
      this.active += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release() {
    this.active -= 1;
    this.drain();
  }

  private drain() {
    if (this.active >= this.concurrency) {
      return;
    }

    const resolve = this.queue.shift();
    resolve?.();
  }
}

const DEFAULT_TTL_MS = 30_000;

export class RequestBroker {
  private cache = new Map<string, BrokerCacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<RequestBrokerResult<unknown>>>();
  private limiters = new Map<string, ChainLimiter>();
  private defaultConcurrency: number;
  private onDegraded?: (reason: RequestBrokerDegradedReason) => void;

  constructor(options: RequestBrokerOptions = {}) {
    this.defaultConcurrency = options.defaultConcurrency ?? 4;
    this.onDegraded = options.onDegraded;
  }

  fetch<T>(
    options: RequestBrokerFetchOptions<T>
  ): Promise<RequestBrokerResult<T>> {
    const fullKey = `${options.chainId}:${options.key}`;
    const cached = this.getFreshCacheEntry<T>(fullKey);
    if (cached) {
      return Promise.resolve({
        data: cached.data,
        endpoint: cached.endpoint,
        stale: false,
      });
    }

    const existing = this.inFlight.get(fullKey);
    if (existing) {
      return existing as Promise<RequestBrokerResult<T>>;
    }

    const promise = this.getLimiter(
      options.chainId,
      options.concurrency ?? this.defaultConcurrency
    )
      .run(() => this.execute(options))
      .finally(() => this.inFlight.delete(fullKey));

    this.inFlight.set(fullKey, promise);
    return promise;
  }

  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }

  invalidate(options: { chainId?: string; key?: string; pattern?: string }) {
    const exactKey =
      options.chainId && options.key
        ? `${options.chainId}:${options.key}`
        : null;

    for (const key of Array.from(this.cache.keys())) {
      if (
        (exactKey && key === exactKey) ||
        (options.pattern && key.includes(options.pattern))
      ) {
        this.cache.delete(key);
      }
    }
  }

  private getLimiter(chainId: string, concurrency: number) {
    const normalizedConcurrency = Math.max(1, concurrency);
    let limiter = this.limiters.get(chainId);
    if (!limiter) {
      limiter = new ChainLimiter(normalizedConcurrency);
      this.limiters.set(chainId, limiter);
    } else {
      limiter.setConcurrency(normalizedConcurrency);
    }
    return limiter;
  }

  private getFreshCacheEntry<T>(cacheKey: string) {
    const entry = this.cache.get(cacheKey) as BrokerCacheEntry<T> | undefined;
    if (!entry || entry.ttlMs <= 0) {
      return null;
    }

    return Date.now() - entry.timestamp < entry.ttlMs ? entry : null;
  }

  private async execute<T>(
    options: RequestBrokerFetchOptions<T>
  ): Promise<RequestBrokerResult<T>> {
    const endpoints = normalizeEndpoints(options.endpoints);
    if (endpoints.length === 0) {
      throw new Error("No RPC endpoints configured for request.");
    }

    const cacheKey = `${options.chainId}:${options.key}`;
    const staleEntry = this.cache.get(cacheKey) as
      | BrokerCacheEntry<T>
      | undefined;
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    let fallbackReason: RequestBrokerDegradedReason | undefined;
    let lastError: unknown = null;
    let lastErrorRetryable = false;

    for (const [endpointIndex, endpoint] of endpoints.entries()) {
      try {
        const data = await options.request(endpoint, endpointIndex);
        this.cache.set(cacheKey, {
          data,
          endpoint,
          timestamp: Date.now(),
          ttlMs,
        });

        return {
          data,
          endpoint,
          stale: false,
          degradedReason: fallbackReason,
        };
      } catch (error) {
        lastError = error;
        lastErrorRetryable = isRetryableRpcError(error);
        if (!lastErrorRetryable) {
          break;
        }

        const nextEndpoint = endpoints[endpointIndex + 1];
        if (nextEndpoint) {
          fallbackReason = {
            kind: "fallback",
            chainId: options.chainId,
            key: options.key,
            failedEndpoint: endpoint,
            endpoint: nextEndpoint,
            message: getErrorMessage(error),
          };
          this.onDegraded?.(fallbackReason);
          continue;
        }
      }
    }

    if (
      staleEntry &&
      options.allowStaleOnError === true &&
      lastErrorRetryable
    ) {
      const reason: RequestBrokerDegradedReason = {
        kind: "stale",
        chainId: options.chainId,
        key: options.key,
        message: getErrorMessage(lastError),
      };
      this.onDegraded?.(reason);
      return {
        data: staleEntry.data,
        endpoint: staleEntry.endpoint,
        stale: true,
        degradedReason: reason,
      };
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("RPC request failed.");
  }
}

export function isRetryableRpcError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("403") ||
    message.includes("429") ||
    message.includes("525") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("too many requests")
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeEndpoints(endpoints: string[]) {
  return Array.from(
    new Set(endpoints.map((endpoint) => endpoint.trim()).filter(Boolean))
  );
}

export const requestBroker = new RequestBroker();
