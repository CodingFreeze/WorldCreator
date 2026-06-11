import { describe, it, expect, beforeAll } from "vitest";
import { PhysicsWorld } from "./PhysicsWorld";

describe("PhysicsWorld", () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = await PhysicsWorld.create();
  });

  it("a dynamic ball falls under gravity onto a fixed ground", () => {
    physics.addFixedCuboid({ x: 0, y: -0.5, z: 0 }, { x: 50, y: 0.5, z: 50 });
    const ball = physics.addDynamicBall({ x: 0, y: 5, z: 0 }, 0.5);
    for (let i = 0; i < 300; i++) physics.step();
    const pos = ball.translation();
    expect(pos.y).toBeLessThan(5); // fell
    expect(pos.y).toBeGreaterThan(0); // rests on ground, not through it
  });
});
