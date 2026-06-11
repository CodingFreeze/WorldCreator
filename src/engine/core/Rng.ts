/**
 * Deterministic seeded RNG (mulberry32). Worlds must be reproducible from a
 * seed — never use ambient randomness in generation code.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Pick a random element. Throws on empty array. */
  pick<T>(arr: readonly T[]): T {
    const item = arr[Math.floor(this.next() * arr.length)];
    if (item === undefined && arr.length === 0) throw new Error("pick from empty array");
    return item as T;
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Derive an independent child stream (for subsystem isolation). */
  fork(label: number): Rng {
    return new Rng((this.state ^ Math.imul(label, 0x9e3779b9)) >>> 0);
  }
}
