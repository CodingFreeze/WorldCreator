import * as THREE from "three";
import { Rng } from "@engine/core/Rng";
import { woodTexture } from "./canvasTextures";

export interface TreeResult {
  group: THREE.Group;
  trunkRadius: number;
}

const CANOPY_GREENS = ["#4a7a35", "#557f3a", "#3f7030", "#5f8a42"];

/** Lumpy storybook tree: tilted trunk + 2-3 overlapping canopy blobs. */
export function createTree(rng: Rng): TreeResult {
  const group = new THREE.Group();
  const trunkH = rng.range(1.6, 2.8);
  const trunkR = rng.range(0.14, 0.26);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.8, trunkR * 1.2, trunkH, 7),
    new THREE.MeshLambertMaterial({
      map: woodTexture(rng.int(0, 1e9), "#6a4e30", "#46331e"),
    }),
  );
  trunk.position.y = trunkH / 2;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  trunk.castShadow = true;
  group.add(trunk);

  const blobs = rng.int(2, 3);
  for (let i = 0; i < blobs; i++) {
    const r = rng.range(0.8, 1.4);
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(r, 7, 6),
      new THREE.MeshLambertMaterial({ color: rng.pick(CANOPY_GREENS), flatShading: true }),
    );
    blob.position.set(
      rng.range(-0.6, 0.6),
      trunkH + rng.range(0.2, 0.9),
      rng.range(-0.6, 0.6),
    );
    blob.castShadow = true;
    group.add(blob);
  }

  return { group, trunkRadius: trunkR * 1.2 };
}

/** Low bush — single squashed blob. */
export function createBush(rng: Rng): THREE.Mesh {
  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(rng.range(0.35, 0.6), 7, 5),
    new THREE.MeshLambertMaterial({ color: rng.pick(CANOPY_GREENS), flatShading: true }),
  );
  bush.scale.y = 0.7;
  bush.castShadow = true;
  return bush;
}

/** Picket fence segment of given length along +x, origin at start. */
export function createFence(rng: Rng, length: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({
    map: woodTexture(rng.int(0, 1e9), "#8a7050", "#5a4530"),
  });
  const posts = Math.max(2, Math.round(length / 1.2) + 1);
  const gap = length / (posts - 1);
  for (let i = 0; i < posts; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat);
    post.position.set(i * gap, 0.45, 0);
    post.rotation.z = rng.range(-0.05, 0.05);
    post.castShadow = true;
    group.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, 0.06), mat);
  rail.position.set(length / 2, 0.65, 0);
  group.add(rail);
  return group;
}
