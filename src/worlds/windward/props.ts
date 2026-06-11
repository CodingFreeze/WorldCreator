import * as THREE from "three";
import { Rng } from "@engine/core/Rng";

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/** Leaning palm: stacked tilted trunk segments + radiating fronds. */
export function createPalm(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const lean = rng.range(-0.18, 0.18);
  const segs = 4;
  let y = 0;
  let xOff = 0;
  for (let i = 0; i < segs; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 - i * 0.015, 0.15 - i * 0.015, 1.1, 6),
      lambert("#8a6a4a"),
    );
    xOff += lean * 0.9;
    seg.position.set(xOff, y + 0.55, 0);
    seg.rotation.z = lean;
    seg.castShadow = true;
    g.add(seg);
    y += 1.0;
  }
  const crownY = y + 0.2;
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.0, 4), lambert("#4a9a4a"));
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(xOff + Math.cos(a) * 0.8, crownY, Math.sin(a) * 0.8);
    frond.rotation.z = Math.cos(a) * 1.25;
    frond.rotation.x = -Math.sin(a) * 1.25;
    frond.castShadow = true;
    g.add(frond);
  }
  const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), lambert("#6a4a2a"));
  coconut.position.set(xOff, crownY - 0.2, 0.2);
  g.add(coconut);
  return g;
}

/** Weathered ruin cluster: standing + toppled columns. */
export function createRuins(rng: Rng): THREE.Group {
  const g = new THREE.Group();
  const stone = lambert("#cfc8b4");
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const h = rng.range(1.2, 3.2);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, h, 7), stone);
    const x = Math.cos(a) * 3;
    const z = Math.sin(a) * 3;
    if (rng.chance(0.35)) {
      col.rotation.z = Math.PI / 2 - rng.range(-0.2, 0.2);
      col.position.set(x + rng.range(-0.8, 0.8), 0.36, z);
    } else {
      col.position.set(x, h / 2, z);
    }
    col.castShadow = true;
    col.receiveShadow = true;
    g.add(col);
  }
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.6), stone);
  slab.position.y = 0.15;
  slab.rotation.y = rng.range(0, Math.PI);
  slab.receiveShadow = true;
  g.add(slab);
  return g;
}

export interface ShrineResult {
  group: THREE.Group;
  /** Light beam shown when all relics are returned. */
  beam: THREE.Mesh;
  orb: THREE.Mesh;
}

/** Hilltop shrine: two pillars, a lintel, a dormant orb, a hidden beam. */
export function createShrine(): ShrineResult {
  const g = new THREE.Group();
  const stone = lambert("#e8e0c8");
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.5), stone);
    pillar.position.set(side * 1.4, 1.7, 0);
    pillar.castShadow = true;
    g.add(pillar);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.45, 0.7), stone);
  lintel.position.y = 3.6;
  lintel.castShadow = true;
  g.add(lintel);

  const orbMat = new THREE.MeshBasicMaterial({ color: "#7a7a7a" });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), orbMat);
  orb.position.y = 1.6;
  g.add(orb);

  const beamMat = new THREE.MeshBasicMaterial({
    color: "#aef0ff",
    transparent: true,
    opacity: 0.5,
  });
  beamMat.toneMapped = false;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 60, 10, 1, true), beamMat);
  beam.position.y = 30;
  beam.visible = false;
  g.add(beam);

  return { group: g, beam, orb };
}

export interface ChestResult {
  group: THREE.Group;
  lid: THREE.Mesh;
}

/** Treasure chest with an openable lid. */
export function createChest(): ChestResult {
  const g = new THREE.Group();
  const wood = lambert("#7a5a30");
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), wood);
  base.position.y = 0.25;
  base.castShadow = true;
  g.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.6), lambert("#8a6a3a"));
  lid.geometry.translate(0, 0.125, 0.3); // hinge at the back edge
  lid.position.set(0, 0.5, -0.3);
  lid.castShadow = true;
  g.add(lid);
  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.05), lambert("#d4b44a"));
  clasp.position.set(0, 0.45, 0.31);
  g.add(clasp);
  return { group: g, lid };
}

/** Spinning golden relic. */
export function createRelic(): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color: "#ffd23a" });
  mat.toneMapped = false;
  const relic = new THREE.Mesh(new THREE.TetrahedronGeometry(0.4, 0), mat);
  relic.position.y = 1.0;
  return relic;
}
