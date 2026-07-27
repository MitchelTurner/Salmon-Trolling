export type TtlCacheEntry<T> = {
  readonly value: T;
  readonly expiresAtMs: number;
};

/** Minimal TTL cache used by outbound integrations (Redis later). */
export class MemoryTtlCache {
  private readonly store = new Map<string, TtlCacheEntry<unknown>>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAtMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAtMs: this.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
