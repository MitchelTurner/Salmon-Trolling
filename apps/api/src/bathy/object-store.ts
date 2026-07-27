/**
 * Object-storage boundary for one-time bathymetry tile puts.
 * Production wires S3/R2; tests use {@link MemoryObjectStore}.
 */
export interface ObjectStore {
  has(key: string): Promise<boolean>;
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, body: Uint8Array, contentType?: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class MemoryObjectStore implements ObjectStore {
  private readonly objects = new Map<string, Uint8Array>();

  async has(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const body = this.objects.get(key);
    return body ? new Uint8Array(body) : undefined;
  }

  async put(
    key: string,
    body: Uint8Array,
    _contentType?: string,
  ): Promise<void> {
    this.objects.set(key, new Uint8Array(body));
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.objects.keys()]
      .filter((k) => k.startsWith(prefix))
      .sort();
  }
}

export const OBJECT_STORE = Symbol('OBJECT_STORE');
