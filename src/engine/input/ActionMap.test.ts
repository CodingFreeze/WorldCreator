import { describe, it, expect } from "vitest";
import { ActionMap } from "./ActionMap";

const bindings = {
  moveForward: ["KeyW", "ArrowUp"],
  jump: ["Space"],
  attack: ["Mouse0"],
} as const;

describe("ActionMap", () => {
  it("isDown reflects key state for any bound code", () => {
    const m = new ActionMap(bindings);
    expect(m.isDown("moveForward")).toBe(false);
    m.setKey("KeyW", true);
    expect(m.isDown("moveForward")).toBe(true);
    m.setKey("KeyW", false);
    m.setKey("ArrowUp", true);
    expect(m.isDown("moveForward")).toBe(true);
  });

  it("consumePressed fires once per press edge", () => {
    const m = new ActionMap(bindings);
    m.setKey("Space", true);
    expect(m.consumePressed("jump")).toBe(true);
    expect(m.consumePressed("jump")).toBe(false); // already consumed
    m.setKey("Space", false);
    m.setKey("Space", true);
    expect(m.consumePressed("jump")).toBe(true);
  });

  it("accumulates and drains mouse delta", () => {
    const m = new ActionMap(bindings);
    m.addMouseDelta(3, -2);
    m.addMouseDelta(1, 1);
    expect(m.drainMouseDelta()).toEqual({ x: 4, y: -1 });
    expect(m.drainMouseDelta()).toEqual({ x: 0, y: 0 });
  });
});
