import RAPIER from "@dimforge/rapier3d-compat";

export type Vec3 = { x: number; y: number; z: number };

let rapierReady: Promise<void> | null = null;
function initRapier(): Promise<void> {
  // RAPIER.init() logs a deprecation warning in 0.19 but the typed API
  // accepts no arguments; harmless, revisit on next rapier upgrade.
  rapierReady ??= RAPIER.init().then(() => undefined);
  return rapierReady;
}

/** Thin ownership wrapper around a Rapier world. Fixed 1/60 step. */
export class PhysicsWorld {
  static readonly STEP = 1 / 60;

  static async create(): Promise<PhysicsWorld> {
    await initRapier();
    return new PhysicsWorld(new RAPIER.World({ x: 0, y: -9.81, z: 0 }));
  }

  private constructor(readonly world: RAPIER.World) {
    this.world.timestep = PhysicsWorld.STEP;
  }

  step(): void {
    this.world.step();
  }

  /** Static box collider; halfExtents are half side lengths. */
  addFixedCuboid(pos: Vec3, halfExtents: Vec3): RAPIER.Collider {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z),
    );
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z),
      body,
    );
  }

  /** Static vertical cylinder (tree trunks, well, posts). */
  addFixedCylinder(pos: Vec3, halfHeight: number, radius: number): RAPIER.Collider {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z),
    );
    return this.world.createCollider(RAPIER.ColliderDesc.cylinder(halfHeight, radius), body);
  }

  addDynamicBall(pos: Vec3, radius: number): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z),
    );
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius), body);
    return body;
  }

  /** Kinematic capsule body for characters. Returns body + collider. */
  addKinematicCapsule(
    pos: Vec3,
    halfHeight: number,
    radius: number,
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeight, radius),
      body,
    );
    return { body, collider };
  }

  createCharacterController(offset = 0.02): RAPIER.KinematicCharacterController {
    const c = this.world.createCharacterController(offset);
    c.enableAutostep(0.4, 0.2, true);
    c.enableSnapToGround(0.4);
    c.setApplyImpulsesToDynamicBodies(true);
    return c;
  }
}
