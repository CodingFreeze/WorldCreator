import { Rng } from "@engine/core/Rng";

export interface CottagePlacement {
  x: number;
  z: number;
  /** Yaw so the door faces the village green. */
  rotY: number;
  seed: number;
}

export interface TreePlacement {
  x: number;
  z: number;
  seed: number;
}

export interface FencePlacement {
  x: number;
  z: number;
  rotY: number;
  length: number;
  seed: number;
}

export interface VillageLayout {
  seed: number;
  cottages: CottagePlacement[];
  trees: TreePlacement[];
  fences: FencePlacement[];
  chickenSpawns: { x: number; z: number }[];
  /** Path strips from green to each cottage door (for ground painting). */
  paths: { x1: number; z1: number; x2: number; z2: number; width: number }[];
  greenRadius: number;
}

const COTTAGE_RING_MIN = 13;
const COTTAGE_RING_MAX = 19;
const COTTAGE_MIN_GAP = 7.5;

/**
 * Pure village plan from a seed: cottages on a jittered ring facing the
 * green, woods beyond, fences and chickens scattered. No Three.js imports —
 * deterministic and unit-testable.
 */
export function generateVillageLayout(seed: number, cottageCount = 10): VillageLayout {
  const rng = new Rng(seed);
  const cottages: CottagePlacement[] = [];

  let attempts = 0;
  while (cottages.length < cottageCount && attempts < 500) {
    attempts++;
    const angle = rng.range(0, Math.PI * 2);
    const radius = rng.range(COTTAGE_RING_MIN, COTTAGE_RING_MAX);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tooClose = cottages.some((c) => Math.hypot(c.x - x, c.z - z) < COTTAGE_MIN_GAP);
    if (tooClose) continue;
    // Door faces the green: rotate so local +z points at origin.
    const rotY = Math.atan2(-x, -z);
    cottages.push({ x, z, rotY, seed: rng.int(0, 1e9) });
  }

  const treeRng = rng.fork(1);
  const trees: TreePlacement[] = [];
  // Scattered ring around the village.
  for (let i = 0; i < 45; i++) {
    const angle = treeRng.range(0, Math.PI * 2);
    const radius = treeRng.range(24, 42);
    trees.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      seed: treeRng.int(0, 1e9),
    });
  }
  // Denser woods to the north (combat zone later).
  for (let i = 0; i < 30; i++) {
    trees.push({
      x: treeRng.range(-30, 30),
      z: treeRng.range(-52, -30),
      seed: treeRng.int(0, 1e9),
    });
  }

  const fenceRng = rng.fork(2);
  const fences: FencePlacement[] = [];
  for (const c of cottages) {
    if (!fenceRng.chance(0.5)) continue;
    fences.push({
      x: c.x + fenceRng.range(-3, 3),
      z: c.z + fenceRng.range(-3, 3),
      rotY: fenceRng.range(0, Math.PI),
      length: fenceRng.range(2.5, 5),
      seed: fenceRng.int(0, 1e9),
    });
  }

  const chickenRng = rng.fork(3);
  const chickenSpawns = Array.from({ length: 8 }, () => ({
    x: chickenRng.range(-10, 10),
    z: chickenRng.range(-10, 10),
  }));

  // Paths to every other cottage only — all ten merge into a mud plaza.
  const paths = cottages
    .filter((_, i) => i % 2 === 0)
    .map((c) => {
      const len = Math.hypot(c.x, c.z);
      const t0 = 5 / len; // start at the green's edge
      return {
        x1: c.x * t0,
        z1: c.z * t0,
        x2: c.x * 0.9,
        z2: c.z * 0.9,
        width: 0.8,
      };
    });

  return { seed, cottages, trees, fences, chickenSpawns, paths, greenRadius: 5 };
}

/** Distance from point to segment — used for path painting. */
export function distToSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}
