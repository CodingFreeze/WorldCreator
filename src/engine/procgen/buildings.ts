import * as THREE from "three";
import { Rng } from "@engine/core/Rng";
import { plasterTexture, thatchTexture, woodTexture } from "./canvasTextures";

export interface CottageResult {
  group: THREE.Group;
  /** Footprint half-extents for the physics collider. */
  halfExtents: { x: number; y: number; z: number };
  /** Window meshes — emissive intensity driven by time of day. */
  windows: THREE.Mesh[];
}

const WALL_TINTS = ["#e8dcc3", "#ddd0b4", "#e3d3be", "#d9cba8"];
const ROOF_TINTS = ["#8a6b42", "#7d5f3a", "#94744a"];

/**
 * Crooked storybook cottage: tapered walls, oversized thatch roof, chimney,
 * round-top door, glowing windows. Whimsy via shape language (spec §7).
 */
export function createCottage(rng: Rng): CottageResult {
  const group = new THREE.Group();
  const windows: THREE.Mesh[] = [];

  const w = rng.range(3.2, 4.4);
  const d = rng.range(2.8, 3.8);
  const h = rng.range(2.4, 3.0);
  const lean = rng.range(-0.04, 0.04);

  const wallTex = plasterTexture(rng.int(0, 1e9), rng.pick(WALL_TINTS), "#9a8a6a");
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ map: wallTex }),
  );
  walls.position.y = h / 2;
  walls.rotation.z = lean;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Oversized thatch roof: squashed cone with 4 sides reads as a crooked pyramid.
  const roofTex = thatchTexture(rng.int(0, 1e9), rng.pick(ROOF_TINTS), "#5a4528");
  const roofH = rng.range(1.6, 2.2);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.85, roofH, 4),
    new THREE.MeshLambertMaterial({ map: roofTex }),
  );
  roof.position.y = h + roofH / 2 - 0.1;
  roof.rotation.y = Math.PI / 4;
  roof.rotation.z = lean * 1.4;
  roof.castShadow = true;
  group.add(roof);

  // Crooked chimney.
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, rng.range(1.0, 1.5), 0.4),
    new THREE.MeshLambertMaterial({ map: woodTexture(rng.int(0, 1e9), "#9a8a7a", "#6a5a4a") }),
  );
  chimney.position.set(w * 0.25, h + roofH * 0.6, d * 0.15);
  chimney.rotation.z = rng.range(-0.08, 0.08);
  chimney.castShadow = true;
  group.add(chimney);

  // Round-top door.
  const doorMat = new THREE.MeshLambertMaterial({
    map: woodTexture(rng.int(0, 1e9), "#7a5a38", "#4a3520"),
  });
  const door = new THREE.Group();
  const doorBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.08), doorMat);
  doorBody.position.y = 0.65;
  const doorArch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.08, 18, 1, false, 0, Math.PI),
    doorMat,
  );
  doorArch.rotation.x = Math.PI / 2;
  doorArch.rotation.z = Math.PI / 2;
  doorArch.position.y = 1.3;
  door.add(doorBody, doorArch);
  door.position.set(0, 0, d / 2 + 0.05);
  group.add(door);

  // Windows: emissive panes, lit at night by the world update.
  const winMat = new THREE.MeshLambertMaterial({
    color: "#3a3528",
    emissive: new THREE.Color("#ffb84d"),
    emissiveIntensity: 0,
  });
  const winCount = rng.int(1, 2);
  for (let i = 0; i < winCount; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), winMat.clone());
    const side = i === 0 ? -1 : 1;
    win.position.set(side * w * 0.28, h * 0.55, d / 2 + 0.04);
    group.add(win);
    windows.push(win);
  }

  return { group, halfExtents: { x: w / 2, y: h / 2 + roofH / 2, z: d / 2 }, windows };
}

/** Stone wishing well with a little roof. */
export function createWell(rng: Rng): { group: THREE.Group; radius: number } {
  const group = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({
    map: plasterTexture(rng.int(0, 1e9), "#9a958a", "#6a655a"),
  });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.7, 16), stone);
  ring.position.y = 0.35;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  const wood = new THREE.MeshLambertMaterial({
    map: woodTexture(rng.int(0, 1e9), "#7a5a38", "#4a3520"),
  });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), wood);
    post.position.set(side * 0.7, 1.05, 0);
    post.castShadow = true;
    group.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 4), wood);
  roof.position.y = 2.0;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  return { group, radius: 0.9 };
}
