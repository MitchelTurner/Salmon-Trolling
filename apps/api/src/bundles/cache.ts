/**
 * Redis-shaped cache for signed dock bundles.
 * Production uses Redis; tests use {@link MemoryBundleCache}.
 */
export interface BundleCache {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array, ttlSeconds: number): Promise<void>;
}

export class MemoryBundleCache implements BundleCache {
  private readonly store = new Map<
    string,
    { value: Uint8Array; expiresAtMs: number }
  >();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async get(key: string): Promise<Uint8Array | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAtMs) {
      this.store.delete(key);
      return undefined;
    }
    return new Uint8Array(entry.value);
  }

  async set(key: string, value: Uint8Array, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value: new Uint8Array(value),
      expiresAtMs: this.now() + ttlSeconds * 1000,
    });
  }
}

export const BUNDLE_CACHE = Symbol('BUNDLE_CACHE');
