import { describe, it, expect } from "vitest";
import { Health } from "./Health";

describe("Health", () => {
  it("takes damage and dies at zero", () => {
    const h = new Health(10);
    h.damage(4);
    expect(h.current).toBe(6);
    h.update(1);
    h.damage(6);
    expect(h.dead).toBe(true);
  });

  it("i-frames block immediate follow-up damage", () => {
    const h = new Health(10);
    expect(h.damage(3)).toBe(true);
    expect(h.damage(3)).toBe(false); // inside i-frames
    h.update(1);
    expect(h.damage(3)).toBe(true);
  });

  it("heal clamps to max and revive restores fully", () => {
    const h = new Health(10);
    h.damage(8);
    h.heal(20);
    expect(h.current).toBe(10);
    h.update(1);
    h.damage(10);
    expect(h.dead).toBe(true);
    h.revive();
    expect(h.current).toBe(10);
    expect(h.dead).toBe(false);
  });
});
