import { describe, it, expect } from "vitest";
import { computeWitnesses, type Observer } from "./perception";
import type { WorldEvent } from "./events";

const event: WorldEvent = {
  id: 1,
  type: "theft",
  actor: "player",
  x: 0,
  z: 0,
  timeHours: 12,
};

const facingOrigin = (x: number, z: number): number => Math.atan2(-x, -z);

describe("computeWitnesses", () => {
  it("nearby observer facing the event witnesses it", () => {
    const npc: Observer = { id: "a", x: 5, z: 0, facing: facingOrigin(5, 0) };
    expect(computeWitnesses(event, [npc], () => true)).toEqual(["a"]);
  });

  it("out-of-range observer sees nothing", () => {
    const npc: Observer = { id: "a", x: 50, z: 0, facing: facingOrigin(50, 0) };
    expect(computeWitnesses(event, [npc], () => true)).toEqual([]);
  });

  it("observer facing directly away sees nothing", () => {
    const npc: Observer = { id: "a", x: 5, z: 0, facing: facingOrigin(-5, 0) };
    expect(computeWitnesses(event, [npc], () => true)).toEqual([]);
  });

  it("occluded observer sees nothing — walls matter", () => {
    const npc: Observer = { id: "a", x: 5, z: 0, facing: facingOrigin(5, 0) };
    expect(computeWitnesses(event, [npc], () => false)).toEqual([]);
  });

  it("observer standing on the event always perceives it", () => {
    const npc: Observer = { id: "a", x: 0.1, z: 0.1, facing: 0 };
    expect(computeWitnesses(event, [npc], () => true)).toEqual(["a"]);
  });
});
