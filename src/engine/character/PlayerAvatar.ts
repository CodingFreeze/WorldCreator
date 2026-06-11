import type * as THREE from "three";
import {
  createHumanoid,
  animateHumanoid,
  type HumanoidColors,
  type HumanoidParts,
} from "@engine/procgen/humanoid";
import type { Vec3 } from "@engine/physics/PhysicsWorld";

/** Capsule center -> feet offset (capsule half height + radius). */
const FEET_OFFSET = 0.85;

/**
 * The player's visual body: humanoid mesh, facing, walk cycle, strike pose.
 * Owns no physics — call advance() in the fixed step and sync() in render.
 */
export class PlayerAvatar {
  readonly parts: HumanoidParts;
  facing = 0;
  private walkPhase = 0;
  private swingTimer = 0;

  constructor(scene: THREE.Scene, colors: HumanoidColors) {
    this.parts = createHumanoid(colors);
    scene.add(this.parts.group);
  }

  /** Fixed-step: update facing + stride from the movement vector. */
  advance(step: number, move: { x: number; z: number }): boolean {
    const moving = move.x !== 0 || move.z !== 0;
    if (moving) {
      this.facing = Math.atan2(move.x, move.z);
      this.walkPhase += step * 9;
    }
    return moving;
  }

  /** Raise the strike arm for a moment (attacks, casts). */
  strike(duration = 0.25): void {
    this.swingTimer = duration;
  }

  /** Render-step: place and animate the body at the capsule position. */
  sync(pos: Vec3, dt: number, moving: boolean): void {
    this.parts.group.position.set(pos.x, pos.y - FEET_OFFSET, pos.z);
    this.parts.group.rotation.y = this.facing;
    animateHumanoid(this.parts, moving ? this.walkPhase : this.walkPhase + dt, moving ? 1 : 0);
    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      this.parts.rightArm.rotation.x = -2.1;
    }
  }
}
