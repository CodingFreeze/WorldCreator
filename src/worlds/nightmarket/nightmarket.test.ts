import { describe, it, expect } from "vitest";
import { generateMarketLayout } from "./layout";
import { DroneCore, droneSees } from "./drone";

describe("generateMarketLayout", () => {
  it("is deterministic per seed", () => {
    expect(generateMarketLayout(5)).toEqual(generateMarketLayout(5));
    expect(generateMarketLayout(5).stalls).not.toEqual(generateMarketLayout(6).stalls);
  });

  it("keeps the street walkable: stalls hug the walls", () => {
    const layout = generateMarketLayout(11);
    for (const s of layout.stalls) {
      expect(Math.abs(s.x)).toBeGreaterThan(5);
    }
    for (const c of layout.creditSpawns) {
      expect(Math.abs(c.x)).toBeLessThan(5.5);
    }
    expect(layout.terminals.length).toBe(3);
  });
});

describe("DroneCore", () => {
  it("cycles waypoints on arrival", () => {
    const d = new DroneCore(3);
    expect(d.update(0.1, true, false).waypoint).toBe(1);
    expect(d.update(0.1, true, false).waypoint).toBe(2);
    expect(d.update(0.1, true, false).waypoint).toBe(0);
  });

  it("suspicion escalates to alarm only if hacking stays visible", () => {
    const d = new DroneCore(3);
    d.update(0.1, false, true); // -> suspicious
    expect(d.mode).toBe("suspicious");
    d.update(0.5, false, false); // hacker hid -> back to patrol
    expect(d.mode).toBe("patrol");
    d.update(0.1, false, true);
    let triggered = false;
    for (let i = 0; i < 15; i++) {
      if (d.update(0.1, false, true).alarmTriggered) triggered = true;
    }
    expect(triggered).toBe(true);
    expect(d.mode).toBe("alarm");
  });

  it("alarm cools back down to patrol", () => {
    const d = new DroneCore(3);
    d.update(0.1, false, true);
    for (let i = 0; i < 15; i++) d.update(0.1, false, true);
    expect(d.mode).toBe("alarm");
    for (let i = 0; i < 60; i++) d.update(0.1, false, false);
    expect(d.mode).toBe("patrol");
  });
});

describe("droneSees", () => {
  it("sees targets in the cone, misses behind", () => {
    // Drone at origin facing +z.
    expect(droneSees(0, 0, 0, 0, 5)).toBe(true);
    expect(droneSees(0, 0, 0, 0, -5)).toBe(false); // behind
    expect(droneSees(0, 0, 0, 0, 20)).toBe(false); // too far
    expect(droneSees(0, 0, 0, 8, 5)).toBe(false); // wide off-cone
  });
});
