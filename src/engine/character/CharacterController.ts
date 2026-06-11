import type RAPIER from "@dimforge/rapier3d-compat";
import { PhysicsWorld, type Vec3 } from "@engine/physics/PhysicsWorld";

export interface CharacterTuning {
  walkSpeed: number;
  jumpSpeed: number;
  gravity: number;
  capsuleHalfHeight: number;
  capsuleRadius: number;
}

const DEFAULT_TUNING: CharacterTuning = {
  walkSpeed: 4,
  jumpSpeed: 6.5,
  gravity: -18, // gamier than -9.81
  capsuleHalfHeight: 0.5,
  capsuleRadius: 0.35,
};

/** Kinematic capsule character driven by Rapier's KinematicCharacterController. */
export class CharacterController {
  private readonly body: RAPIER.RigidBody;
  private readonly collider: RAPIER.Collider;
  private readonly kcc: RAPIER.KinematicCharacterController;
  private verticalVel = 0;
  grounded = false;
  readonly tuning: CharacterTuning;

  constructor(physics: PhysicsWorld, spawn: Vec3, tuning?: Partial<CharacterTuning>) {
    this.tuning = { ...DEFAULT_TUNING, ...tuning };
    const made = physics.addKinematicCapsule(
      spawn,
      this.tuning.capsuleHalfHeight,
      this.tuning.capsuleRadius,
    );
    this.body = made.body;
    this.collider = made.collider;
    this.kcc = physics.createCharacterController();
  }

  /**
   * @param move desired horizontal direction, components in [-1,1] (world space)
   * @param jump true on the frame jump was pressed
   */
  update(move: { x: number; z: number }, jump: boolean, dtSec: number): void {
    if (this.grounded && jump) {
      this.verticalVel = this.tuning.jumpSpeed;
    }
    this.verticalVel += this.tuning.gravity * dtSec;
    if (this.verticalVel < -30) this.verticalVel = -30;

    const len = Math.hypot(move.x, move.z);
    const nx = len > 1 ? move.x / len : move.x;
    const nz = len > 1 ? move.z / len : move.z;

    const desired = {
      x: nx * this.tuning.walkSpeed * dtSec,
      y: this.verticalVel * dtSec,
      z: nz * this.tuning.walkSpeed * dtSec,
    };

    this.kcc.computeColliderMovement(this.collider, desired);
    const corrected = this.kcc.computedMovement();
    const pos = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    });

    this.grounded = this.kcc.computedGrounded();
    if (this.grounded && this.verticalVel < 0) this.verticalVel = 0;
  }

  /** Teleport (save/load, world entry). Resets falling velocity. */
  setPosition(pos: Vec3): void {
    this.body.setNextKinematicTranslation(pos);
    this.verticalVel = 0;
  }

  get position(): Vec3 {
    return this.body.translation();
  }
}
