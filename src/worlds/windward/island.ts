import * as THREE from "three";
import { hashNoise2D } from "@engine/procgen/groundPatch";
import type { PhysicsWorld } from "@engine/physics/PhysicsWorld";

export const ISLAND_RADIUS = 52;
const PEAK_HEIGHT = 11;
const WATER_LEVEL = 0;

/**
 * Island height at a point: radial falloff dome + two octaves of noise.
 * Pure — drives both the render mesh and prop placement, so they always
 * agree.
 */
export function islandHeight(x: number, z: number, seed: number): number {
  const d = Math.hypot(x, z);
  const falloff = Math.max(0, 1 - d / ISLAND_RADIUS);
  const dome = Math.pow(falloff, 1.35) * PEAK_HEIGHT;
  const n =
    hashNoise2D(Math.floor(x / 6), Math.floor(z / 6), seed) * 1.6 +
    hashNoise2D(Math.floor(x / 18), Math.floor(z / 18), seed + 9) * 1.4;
  const h = dome + n * falloff - 1.1;
  return h;
}

const SAND = new THREE.Color(0xe8d8a8);
const GRASS = new THREE.Color(0x6aa84f);
const GRASS_HIGH = new THREE.Color(0x86b86a);
const ROCK = new THREE.Color(0x9a9282);

export interface BuiltIsland {
  mesh: THREE.Mesh;
  heightAt: (x: number, z: number) => number;
}

/** Island terrain mesh + matching trimesh collider. */
export function buildIsland(scene: THREE.Scene, physics: PhysicsWorld, seed: number): BuiltIsland {
  const size = 160;
  const segments = 96;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  if (!pos) throw new Error("terrain missing positions");
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z, seed);
    pos.setY(i, h);
    if (h < WATER_LEVEL + 0.7) c.copy(SAND);
    else if (h > 7.5) c.copy(ROCK);
    else c.lerpColors(GRASS, GRASS_HIGH, hashNoise2D(Math.floor(x / 3), Math.floor(z / 3), seed + 5));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  );
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Physics: exact same triangles.
  const vertices = new Float32Array(pos.array);
  const indexAttr = geo.index;
  if (!indexAttr) throw new Error("terrain missing index");
  physics.addFixedTrimesh(vertices, new Uint32Array(indexAttr.array));

  return { mesh, heightAt: (x, z) => islandHeight(x, z, seed) };
}

/** Gently rolling transparent ocean disc around the island. */
export class Ocean {
  private readonly mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(400, 400, 48, 48);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({
        color: 0x2a8ab8,
        transparent: true,
        opacity: 0.86,
        flatShading: true,
      }),
    );
    this.mesh.position.y = WATER_LEVEL;
    scene.add(this.mesh);
  }

  update(time: number): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const x = arr[i * 3] ?? 0;
      const z = arr[i * 3 + 2] ?? 0;
      arr[i * 3 + 1] = Math.sin(x * 0.12 + time * 1.1) * 0.22 + Math.cos(z * 0.1 + time * 0.8) * 0.18;
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}
