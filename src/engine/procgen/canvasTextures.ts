import * as THREE from "three";
import { Rng } from "@engine/core/Rng";

/** Speckled plaster/stucco wall texture. */
export function plasterTexture(seed: number, base: string, fleck: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const rng = new Rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = fleck;
  for (let i = 0; i < 350; i++) {
    ctx.globalAlpha = rng.range(0.04, 0.16);
    ctx.fillRect(rng.int(0, 127), rng.int(0, 127), rng.int(1, 3), rng.int(1, 3));
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Horizontal plank/wood-grain texture. */
export function woodTexture(seed: number, base: string, groove: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const rng = new Rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = groove;
  for (let y = 0; y < 128; y += rng.int(14, 22)) {
    ctx.globalAlpha = rng.range(0.25, 0.5);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 128; x += 16) {
      ctx.lineTo(x, y + rng.range(-1.5, 1.5));
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Thatch / straw roof texture: layered downward strokes. */
export function thatchTexture(seed: number, base: string, strand: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const rng = new Rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = strand;
  for (let i = 0; i < 500; i++) {
    ctx.globalAlpha = rng.range(0.08, 0.25);
    const x = rng.int(0, 127);
    const y = rng.int(0, 127);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng.range(-2, 2), y + rng.int(4, 10));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
