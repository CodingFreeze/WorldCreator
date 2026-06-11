import { describe, it, expect } from "vitest";
import { WorldEventBus, type WorldEvent } from "./events";
import { NpcMind } from "./NpcMind";

const ev = (id: number, type: WorldEvent["type"], targetId?: string): WorldEvent => ({
  id,
  type,
  actor: "player",
  targetId,
  x: 0,
  z: 0,
  timeHours: 10,
});

describe("NpcMind", () => {
  it("witnessing theft lowers morality view; donation raises it", () => {
    const mind = new NpcMind("marigold");
    mind.witness(ev(1, "theft"));
    expect(mind.morality).toBeLessThan(0);
    mind.witness(ev(2, "donation"));
    mind.witness(ev(3, "donation"));
    expect(mind.morality).toBeGreaterThan(-0.35);
  });

  it("being the target amplifies the personal response", () => {
    const bystander = new NpcMind("a");
    const victim = new NpcMind("b");
    bystander.witness(ev(1, "attacked_villager", "b"));
    victim.witness(ev(1, "attacked_villager", "b"));
    expect(victim.fear).toBeGreaterThan(bystander.fear);
    expect(victim.affection).toBeLessThan(bystander.affection);
  });

  it("the same event never applies twice", () => {
    const mind = new NpcMind("a");
    mind.witness(ev(1, "theft"));
    const after = mind.morality;
    mind.witness(ev(1, "theft"));
    mind.hearGossip(ev(1, "theft"), 0.6);
    expect(mind.morality).toBe(after);
  });

  it("attitude moves from neutral to hostile with repeated crimes", () => {
    const mind = new NpcMind("a");
    expect(mind.attitude).toBe("neutral");
    mind.witness(ev(1, "attacked_villager"));
    mind.witness(ev(2, "theft"));
    expect(mind.attitude).toBe("hostile");
  });

  it("attitude warms with good deeds", () => {
    const mind = new NpcMind("a");
    mind.witness(ev(1, "helped_npc"));
    expect(mind.attitude).toBe("warm");
  });

  it("knowsOnlyByRumor distinguishes gossip-only knowledge", () => {
    const mind = new NpcMind("a");
    mind.hearGossip(ev(1, "theft"), 0.6);
    expect(mind.knowsOnlyByRumor).toBe(true);
    mind.witness(ev(2, "donation"));
    expect(mind.knowsOnlyByRumor).toBe(false);
  });
});

describe("WorldEventBus", () => {
  it("assigns ids and notifies subscribers", () => {
    const bus = new WorldEventBus();
    const seen: number[] = [];
    bus.subscribe((e) => seen.push(e.id));
    bus.emit({ type: "theft", actor: "player", x: 0, z: 0, timeHours: 1 });
    bus.emit({ type: "donation", actor: "player", x: 0, z: 0, timeHours: 2 });
    expect(seen).toEqual([1, 2]);
  });
});
