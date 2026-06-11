import { describe, it, expect, beforeEach } from "vitest";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { CharacterController } from "./CharacterController";

describe("CharacterController", () => {
  let physics: PhysicsWorld;
  let char: CharacterController;

  beforeEach(async () => {
    physics = await PhysicsWorld.create();
    physics.addFixedCuboid({ x: 0, y: -0.5, z: 0 }, { x: 50, y: 0.5, z: 50 });
    char = new CharacterController(physics, { x: 0, y: 1.2, z: 0 });
  });

  const settle = (n: number, move = { x: 0, z: 0 }, jump = false) => {
    for (let i = 0; i < n; i++) {
      char.update(move, jump, PhysicsWorld.STEP);
      physics.step();
      jump = false;
    }
  };

  it("settles onto the ground and reports grounded", () => {
    settle(60);
    expect(char.grounded).toBe(true);
    expect(char.position.y).toBeGreaterThan(0.5);
    expect(char.position.y).toBeLessThan(1.5);
  });

  it("moves horizontally at walk speed", () => {
    settle(60);
    const x0 = char.position.x;
    settle(60, { x: 1, z: 0 }); // 1 second of full forward
    expect(char.position.x - x0).toBeGreaterThan(2); // walkSpeed 4 -> ~4m
  });

  it("is blocked by a wall", () => {
    physics.addFixedCuboid({ x: 2, y: 1.5, z: 0 }, { x: 0.2, y: 1.5, z: 5 });
    settle(60);
    settle(120, { x: 1, z: 0 });
    expect(char.position.x).toBeLessThan(2); // capsule stops at wall
  });

  it("jumps and lands", () => {
    settle(60);
    const restY = char.position.y;
    settle(1, { x: 0, z: 0 }, true);
    settle(15);
    expect(char.position.y).toBeGreaterThan(restY + 0.3); // airborne
    settle(120);
    expect(char.grounded).toBe(true); // landed
  });
});
