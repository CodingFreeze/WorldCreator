import * as THREE from "three";
import { Rng } from "@engine/core/Rng";
import { createChicken, animateChicken, type ChickenParts } from "@engine/procgen/critters";
import type { Vec3 } from "@engine/physics/PhysicsWorld";

type ChickenMode = "idle" | "walk" | "peck" | "flee";

interface ChickenState {
  parts: ChickenParts;
  mode: ChickenMode;
  dir: number; // heading radians
  timer: number;
  phase: number;
  pecking: number;
  home: { x: number; z: number };
}

const WALK_SPEED = 0.8;
const FLEE_SPEED = 2.6;
const FLEE_RADIUS = 1.6;
const HOME_LEASH = 6;

/** Flock of wandering, pecking, player-fleeing chickens. */
export class ChickenFlock {
  private readonly chickens: ChickenState[] = [];
  private readonly rng: Rng;

  constructor(scene: THREE.Scene, spawns: { x: number; z: number }[], seed: number) {
    this.rng = new Rng(seed);
    for (const s of spawns) {
      const parts = createChicken();
      parts.group.position.set(s.x, 0, s.z);
      scene.add(parts.group);
      this.chickens.push({
        parts,
        mode: "idle",
        dir: this.rng.range(0, Math.PI * 2),
        timer: this.rng.range(0.5, 2),
        phase: this.rng.range(0, 10),
        pecking: 0,
        home: { ...s },
      });
    }
  }

  /**
   * Boot the nearest chicken within reach: it bolts, you answer to the
   * village. Returns the chicken's position or null if none in range.
   */
  kickNearest(playerPos: Vec3, maxDist = 1.7): { x: number; z: number } | null {
    let best: ChickenState | null = null;
    let bestDist = maxDist;
    for (const c of this.chickens) {
      const p = c.parts.group.position;
      const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    if (!best) return null;
    const p = best.parts.group.position;
    best.mode = "flee";
    best.dir = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
    best.timer = 2.2;
    return { x: p.x, z: p.z };
  }

  update(dt: number, playerPos: Vec3): void {
    for (const c of this.chickens) {
      const p = c.parts.group.position;
      const distToPlayer = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);

      if (distToPlayer < FLEE_RADIUS && c.mode !== "flee") {
        c.mode = "flee";
        c.dir = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
        c.timer = this.rng.range(0.8, 1.4);
      }

      c.timer -= dt;
      if (c.timer <= 0) {
        // Pick the next behavior; drift back toward home if leashed out.
        const distHome = Math.hypot(p.x - c.home.x, p.z - c.home.z);
        if (distHome > HOME_LEASH) {
          c.mode = "walk";
          c.dir = Math.atan2(c.home.x - p.x, c.home.z - p.z);
          c.timer = this.rng.range(1, 2);
        } else {
          const roll = this.rng.next();
          if (roll < 0.35) {
            c.mode = "idle";
            c.timer = this.rng.range(0.8, 2.2);
          } else if (roll < 0.65) {
            c.mode = "peck";
            c.timer = this.rng.range(0.8, 1.6);
          } else {
            c.mode = "walk";
            c.dir = this.rng.range(0, Math.PI * 2);
            c.timer = this.rng.range(0.8, 2.5);
          }
        }
      }

      const speed = c.mode === "flee" ? FLEE_SPEED : c.mode === "walk" ? WALK_SPEED : 0;
      if (speed > 0) {
        p.x += Math.sin(c.dir) * speed * dt;
        p.z += Math.cos(c.dir) * speed * dt;
        c.parts.group.rotation.y = c.dir;
        c.phase += dt * speed * 6;
      }
      const targetPeck = c.mode === "peck" ? (Math.sin(c.phase * 3) > 0 ? 1 : 0.2) : 0;
      if (c.mode === "peck") c.phase += dt * 2;
      c.pecking += (targetPeck - c.pecking) * Math.min(1, dt * 10);
      animateChicken(c.parts, c.phase, c.pecking);
    }
  }
}
