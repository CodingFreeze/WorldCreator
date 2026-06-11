import * as THREE from "three";
import { Rng } from "@engine/core/Rng";
import { createGroundPatch } from "@engine/procgen/groundPatch";
import type { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import type { MarketLayout } from "./layout";

function neonTexture(text: string, color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#07070d";
    ctx.fillRect(0, 0, 512, 128);
    ctx.font = "bold 58px Courier New, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 66);
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 256, 66);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windowGridTexture(rng: Rng): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#0d0d16";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 12; y < 244; y += 24) {
      for (let x = 12; x < 244; x += 20) {
        if (rng.chance(0.28)) {
          ctx.fillStyle = rng.chance(0.7) ? "#3a4a6a" : "#c8a85a";
          ctx.globalAlpha = rng.range(0.4, 1);
          ctx.fillRect(x, y, 10, 14);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export interface BuiltMarket {
  steamSpots: { x: number; z: number }[];
  vendorPos: { x: number; z: number };
  backroomDoor: THREE.Mesh;
  backroomCollider: ReturnType<PhysicsWorld["addFixedCuboid"]>;
  stashPos: { x: number; z: number };
}

const ASPHALT_LOW = new THREE.Color(0x14141c);
const ASPHALT_HIGH = new THREE.Color(0x1e1e2a);
const PUDDLE = new THREE.Color(0x2a3550);

/** Builds the street canyon, stalls, signs, terminals, and backroom. */
export function buildMarket(
  scene: THREE.Scene,
  physics: PhysicsWorld,
  layout: MarketLayout,
): BuiltMarket {
  const rng = new Rng(layout.seed ^ 0xfeed);

  // Asphalt with puddles (paint cells pseudo-randomly via position hash).
  scene.add(
    createGroundPatch({
      size: 110,
      segments: 60,
      seed: layout.seed,
      amplitude: 0.05,
      colorA: ASPHALT_LOW,
      colorB: ASPHALT_HIGH,
      paint: (x, z) => {
        const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        return n - Math.floor(n) > 0.93 && Math.abs(x) < 7 ? PUDDLE : null;
      },
    }),
  );
  physics.addFixedCuboid({ x: 0, y: -0.5, z: 0 }, { x: 55, y: 0.5, z: 55 });

  // Building rows.
  for (const side of [-1, 1]) {
    for (let z = -42; z <= 42; z += 12) {
      const h = rng.range(8, 15);
      const depth = rng.range(5, 8);
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(depth, h, 11.5),
        new THREE.MeshLambertMaterial({ map: windowGridTexture(rng.fork(z * side)) }),
      );
      block.position.set(side * (10 + depth / 2 - 1), h / 2, z);
      scene.add(block);
      physics.addFixedCuboid(
        { x: block.position.x, y: h / 2, z },
        { x: depth / 2, y: h / 2, z: 5.75 },
      );
    }
  }

  // Neon signs: emissive planes that ignore tone mapping so they POP.
  for (const s of layout.signs) {
    const mat = new THREE.MeshBasicMaterial({ map: neonTexture(s.text, s.color) });
    mat.toneMapped = false;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(s.width, s.width / 4), mat);
    sign.position.set(s.x, s.y, s.z);
    sign.rotation.y = s.rotY;
    scene.add(sign);
  }

  // Stalls.
  const steamSpots: { x: number; z: number }[] = [];
  let vendorPos = { x: 5, z: -28 };
  for (const st of layout.stalls) {
    const group = new THREE.Group();
    const accent = rng.pick(["#ff2a6a", "#2ad8ff", "#3aff8a", "#ffaa2a"]);
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.0, 1.2),
      new THREE.MeshLambertMaterial({ color: "#2a2a38", flatShading: true }),
    );
    counter.position.y = 0.5;
    group.add(counter);
    const canopyMat = new THREE.MeshBasicMaterial({ color: accent });
    canopyMat.toneMapped = false;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 1.8), canopyMat);
    canopy.position.y = 2.2;
    group.add(canopy);
    for (const px of [-1.3, 1.3]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5),
        new THREE.MeshLambertMaterial({ color: "#3a3a48" }),
      );
      post.position.set(px, 1.1, 0.6);
      group.add(post);
    }
    group.position.set(st.x, 0, st.z);
    group.rotation.y = st.rotY;
    scene.add(group);
    physics.addFixedCuboid({ x: st.x, y: 0.6, z: st.z }, { x: 1.3, y: 0.6, z: 0.7 }, st.rotY);
    if (st.kind === "noodle") {
      steamSpots.push({ x: st.x, z: st.z });
      vendorPos = { x: st.x * 0.82, z: st.z };
    }
  }

  // Hack terminals: dark pillar + green screen.
  for (const t of layout.terminals) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.6, 0.4),
      new THREE.MeshLambertMaterial({ color: "#1a1a26", flatShading: true }),
    );
    pillar.position.set(t.x, 0.8, t.z);
    pillar.rotation.y = t.rotY;
    scene.add(pillar);
    const screenMat = new THREE.MeshBasicMaterial({ color: "#2aff7a" });
    screenMat.toneMapped = false;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), screenMat);
    screen.position.set(t.x + Math.sin(t.rotY) * 0.21, 1.1, t.z + Math.cos(t.rotY) * 0.21);
    screen.rotation.y = t.rotY;
    scene.add(screen);
  }

  // Backroom door: slides up when all terminals are hacked.
  const doorMat = new THREE.MeshLambertMaterial({ color: "#3a2a4a", flatShading: true });
  const backroomDoor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 2.4), doorMat);
  backroomDoor.position.set(layout.backroom.x, 1.5, layout.backroom.z);
  scene.add(backroomDoor);
  const backroomCollider = physics.addFixedCuboid(
    { x: layout.backroom.x, y: 1.5, z: layout.backroom.z },
    { x: 0.15, y: 1.5, z: 1.2 },
  );
  const stashPos = { x: layout.backroom.x + 2.2, z: layout.backroom.z };

  // A few real lights so characters read against the dark.
  const lamps: [number, number, string][] = [
    [-4, -26, "#ff2a6a"],
    [4, -8, "#2ad8ff"],
    [-4, 10, "#aa2aff"],
    [4, 30, "#3aff8a"],
  ];
  for (const [x, z, color] of lamps) {
    const light = new THREE.PointLight(color, 140, 38, 1.6);
    light.position.set(x, 5, z);
    scene.add(light);
  }

  return { steamSpots, vendorPos, backroomDoor, backroomCollider, stashPos };
}
