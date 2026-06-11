import { describe, it, expect } from "vitest";
import { PlayerCombat } from "./PlayerCombat";

describe("PlayerCombat", () => {
  it("melee chains 1-2-3 within the combo window", () => {
    const c = new PlayerCombat();
    expect(c.tryMelee()?.kind).toBe("melee1");
    c.update(0.5); // past recovery, inside window
    expect(c.tryMelee()?.kind).toBe("melee2");
    c.update(0.5);
    expect(c.tryMelee()?.kind).toBe("melee3");
  });

  it("combo resets after the window lapses", () => {
    const c = new PlayerCombat();
    c.tryMelee();
    c.update(3); // window (0.45+0.75) long gone
    expect(c.tryMelee()?.kind).toBe("melee1");
  });

  it("attacks are blocked during recovery", () => {
    const c = new PlayerCombat();
    c.tryMelee();
    expect(c.tryMelee()).toBeNull();
    expect(c.tryBolt()).toBeNull();
  });

  it("weaving styles builds flow and boosts damage", () => {
    const c = new PlayerCombat();
    expect(c.tryMelee()?.damageMult).toBe(1); // first hit, no flow
    c.update(0.5);
    expect(c.tryBolt()?.damageMult).toBeCloseTo(1.25); // melee->magic weave
    c.update(0.5);
    expect(c.tryBow()?.damageMult).toBeCloseTo(1.5); // magic->ranged weave
    c.update(1.0); // clear bow cooldown (0.9s)
    // Same style again: no new stack, bonus stays at 2 flow.
    expect(c.tryBow()?.damageMult).toBeCloseTo(1.5);
  });

  it("flow decays back to zero after idle time", () => {
    const c = new PlayerCombat();
    c.tryMelee();
    c.update(0.5);
    c.tryBolt();
    expect(c.flow).toBe(1);
    c.update(5); // beyond decay delay
    expect(c.flow).toBe(0);
  });

  it("bow respects its cooldown independently of melee", () => {
    const c = new PlayerCombat();
    expect(c.tryBow()).not.toBeNull();
    c.update(0.3);
    expect(c.tryBow()).toBeNull(); // still on cooldown
    expect(c.tryMelee()).not.toBeNull(); // melee fine
  });
});
