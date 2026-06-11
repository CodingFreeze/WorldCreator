import * as THREE from "three";
import type { Vec3 } from "@engine/physics/PhysicsWorld";

export interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
}

export const PITCH_MIN = -0.2;
export const PITCH_MAX = 1.2;

export function clampPitch(pitch: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
}

/** Orbit pose: yaw 0 puts the camera at +z looking toward -z. Pure math. */
export function computeCameraPose(
  target: Vec3,
  yaw: number,
  pitch: number,
  distance: number,
  heightOffset: number,
): CameraPose {
  const horiz = distance * Math.cos(pitch);
  const lookAt = { x: target.x, y: target.y + heightOffset, z: target.z };
  return {
    position: {
      x: target.x + Math.sin(yaw) * horiz,
      y: lookAt.y + distance * Math.sin(pitch),
      z: target.z + Math.cos(yaw) * horiz,
    },
    lookAt,
  };
}

const MOUSE_SENS = 0.0025;

/** Stateful orbit camera fed by mouse deltas. Thin over the pure core. */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = 0.35;
  distance = 6;
  heightOffset = 1.5;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  addLook(dx: number, dy: number): void {
    this.yaw -= dx * MOUSE_SENS;
    this.pitch = clampPitch(this.pitch + dy * MOUSE_SENS);
  }

  /** Direction the character should move for "forward" input (camera-relative). */
  forwardDir(): { x: number; z: number } {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  update(target: Vec3): void {
    const pose = computeCameraPose(
      target,
      this.yaw,
      this.pitch,
      this.distance,
      this.heightOffset,
    );
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.camera.lookAt(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z);
  }
}
