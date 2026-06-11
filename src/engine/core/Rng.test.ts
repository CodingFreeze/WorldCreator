import { describe, it, expect } from "vitest";
import { Rng } from "./Rng";

describe("Rng", () => {
  it("same seed produces identical sequences", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it("different seeds diverge", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("range and int stay within bounds", () => {
    const r = new Rng(7);
    for (let i = 0; i < 200; i++) {
      const f = r.range(2, 5);
      expect(f).toBeGreaterThanOrEqual(2);
      expect(f).toBeLessThan(5);
      const n = r.int(1, 3);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it("fork produces an independent deterministic stream", () => {
    const a = new Rng(42).fork(1);
    const b = new Rng(42).fork(1);
    const c = new Rng(42).fork(2);
    expect(a.next()).toBe(b.next());
    expect(a.next()).not.toBe(c.next());
  });
});
