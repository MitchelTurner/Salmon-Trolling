/**
 * Fixed-capacity ring buffer. Full-rate / 1 Hz samples stay in memory for the
 * live display; persistence is a separate downsample step.
 */
export class RingBuffer<T> {
  private readonly buf: Array<T | undefined>;
  private head = 0;
  private size = 0;

  constructor(readonly capacity: number) {
    if (capacity < 1) throw new Error('RingBuffer capacity must be >= 1');
    this.buf = new Array<T | undefined>(capacity);
  }

  get length(): number {
    return this.size;
  }

  push(item: T): void {
    this.buf[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size += 1;
  }

  /** Newest sample, or undefined when empty. */
  latest(): T | undefined {
    if (this.size === 0) return undefined;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buf[idx];
  }

  /** Oldest → newest. */
  toArray(): T[] {
    const out: T[] = [];
    const start =
      this.size === this.capacity ? this.head : 0;
    for (let i = 0; i < this.size; i += 1) {
      const idx = (start + i) % this.capacity;
      const item = this.buf[idx];
      if (item !== undefined) out.push(item);
    }
    return out;
  }

  clear(): void {
    this.buf.fill(undefined);
    this.head = 0;
    this.size = 0;
  }
}
