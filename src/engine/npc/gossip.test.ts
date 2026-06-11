import { describe, it, expect } from "vitest";
import { NpcMind } from "./NpcMind";
import { exchangeGossip, GOSSIP_DECAY } from "./gossip";
import type { WorldEvent } from "./events";

const ev = (id: number, timeHours = 10): WorldEvent => ({
  id,
  type: "theft",
  actor: "player",
  x: 0,
  z: 0,
  timeHours,
});

describe("exchangeGossip", () => {
  it("spreads a witnessed event to the hearer at decayed weight", () => {
    const witness = new NpcMind("a");
    const hearer = new NpcMind("b");
    witness.witness(ev(1));
    const n = exchangeGossip(witness, hearer, 12);
    expect(n).toBe(1);
    const memory = hearer.memories.get(1);
    expect(memory?.secondhand).toBe(true);
    expect(memory?.weight).toBeCloseTo(GOSSIP_DECAY);
    // Hearer's opinion moved, but less than the witness's.
    expect(hearer.morality).toBeLessThan(0);
    expect(hearer.morality).toBeGreaterThan(witness.morality);
  });

  it("re-gossip decays further and dies out (no infinite spread)", () => {
    const a = new NpcMind("a");
    const b = new NpcMind("b");
    const c = new NpcMind("c");
    const d = new NpcMind("d");
    a.witness(ev(1));
    exchangeGossip(a, b, 12); // weight 0.6
    exchangeGossip(b, c, 12); // weight 0.36
    exchangeGossip(c, d, 12); // weight 0.216
    expect(d.memories.get(1)?.weight).toBeCloseTo(0.216, 2);
    const e = new NpcMind("e");
    const f = new NpcMind("f");
    exchangeGossip(d, e, 12); // 0.1296
    const n = exchangeGossip(e, f, 12); // 0.078 < 0.1 -> dropped
    expect(n).toBe(0);
  });

  it("stale stories stop circulating", () => {
    const a = new NpcMind("a");
    const b = new NpcMind("b");
    a.witness(ev(1, 10));
    const n = exchangeGossip(a, b, 10 + 60); // 60h later
    expect(n).toBe(0);
  });

  it("already-known stories are not double-counted", () => {
    const a = new NpcMind("a");
    const b = new NpcMind("b");
    a.witness(ev(1));
    b.witness(ev(1));
    expect(exchangeGossip(a, b, 12)).toBe(0);
  });
});
