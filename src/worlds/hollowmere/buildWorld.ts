import * as THREE from "three";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { Rng } from "@engine/core/Rng";
import { createGroundPatch } from "@engine/procgen/groundPatch";
import { createCottage } from "@engine/procgen/buildings";
import { createWell } from "@engine/procgen/buildings";
import { createTree, createBush, createFence } from "@engine/procgen/vegetation";
import { generateVillageLayout, distToSegment, type VillageLayout } from "./layout";

export interface BuiltVillage {
  layout: VillageLayout;
  /** All cottage windows — emissive driven by time of day. */
  windows: THREE.Mesh[];
}

const GRASS_LOW = new THREE.Color(0x5a7d3a);
const GRASS_HIGH = new THREE.Color(0x8aa85a);
const PATH_DIRT = new THREE.Color(0xa8895c);
const GREEN_GRASS = new THREE.Color(0x6f9347);

/**
 * Instantiates the Hollowmere village into scene + physics from a seed.
 * Visual ground is gently displaced but flattened across the village so
 * buildings sit cleanly; physics ground stays a flat slab.
 */
export function buildVillage(
  scene: THREE.Scene,
  physics: PhysicsWorld,
  seed: number,
): BuiltVillage {
  const layout = generateVillageLayout(seed);
  const windows: THREE.Mesh[] = [];

  const ground = createGroundPatch({
    size: 130,
    segments: 80,
    seed,
    amplitude: 0.7,
    colorA: GRASS_LOW,
    colorB: GRASS_HIGH,
    // Flatten within the village ring, roll beyond it.
    heightScale: (x, z) => {
      const d = Math.hypot(x, z);
      return Math.min(1, Math.max(0, (d - 20) / 12));
    },
    paint: (x, z) => {
      for (const p of layout.paths) {
        if (distToSegment(x, z, p.x1, p.z1, p.x2, p.z2) < p.width) return PATH_DIRT;
      }
      if (Math.hypot(x, z) < layout.greenRadius) return GREEN_GRASS;
      return null;
    },
  });
  scene.add(ground);
  physics.addFixedCuboid({ x: 0, y: -0.5, z: 0 }, { x: 65, y: 0.5, z: 65 });

  // Well at the green's center.
  const wellRng = new Rng(seed ^ 0xbeef);
  const well = createWell(wellRng);
  well.group.position.set(0, 0, 0);
  scene.add(well.group);
  physics.addFixedCylinder({ x: 0, y: 0.5, z: 0 }, 0.5, well.radius);

  for (const c of layout.cottages) {
    const cottage = createCottage(new Rng(c.seed));
    cottage.group.position.set(c.x, 0, c.z);
    cottage.group.rotation.y = c.rotY;
    scene.add(cottage.group);
    physics.addFixedCuboid(
      { x: c.x, y: cottage.halfExtents.y, z: c.z },
      cottage.halfExtents,
      c.rotY,
    );
    windows.push(...cottage.windows);
  }

  for (const t of layout.trees) {
    const rng = new Rng(t.seed);
    const tree = createTree(rng);
    tree.group.position.set(t.x, 0, t.z);
    scene.add(tree.group);
    physics.addFixedCylinder({ x: t.x, y: 1.2, z: t.z }, 1.2, tree.trunkRadius);
    if (rng.chance(0.3)) {
      const bush = createBush(rng);
      bush.position.set(t.x + rng.range(-2, 2), 0.25, t.z + rng.range(-2, 2));
      scene.add(bush);
    }
  }

  for (const f of layout.fences) {
    const fence = createFence(new Rng(f.seed), f.length);
    fence.position.set(f.x, 0, f.z);
    fence.rotation.y = f.rotY;
    scene.add(fence);
  }

  return { layout, windows };
}

/** Window glow: on at dusk/night, off by day. Call once per frame. */
export function updateWindows(windows: THREE.Mesh[], daylight01: number): void {
  const glow = Math.max(0, 1 - daylight01 * 1.6);
  for (const w of windows) {
    (w.material as THREE.MeshLambertMaterial).emissiveIntensity = glow;
  }
}
