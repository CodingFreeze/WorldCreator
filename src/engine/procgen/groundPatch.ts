import * as THREE from "three";

/** Deterministic pseudo-noise (no RNG calls — reproducible worlds). */
export function hashNoise2D(x: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s); // [0,1)
}

export interface GroundPatchOptions {
  size: number;
  segments: number;
  seed: number;
  /** max vertical displacement */
  amplitude: number;
  colorA: THREE.Color; // low
  colorB: THREE.Color; // high
  /** Per-vertex amplitude multiplier (e.g. flatten village center). */
  heightScale?: (x: number, z: number) => number;
  /** Override vertex color (paths, plazas). Return null to keep default. */
  paint?: (x: number, z: number) => THREE.Color | null;
}

/** Flat-shaded, vertex-colored, gently rolling ground plane. */
export function createGroundPatch(opts: GroundPatchOptions): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(opts.size, opts.size, opts.segments, opts.segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  if (!pos) throw new Error("plane geometry missing position attribute");
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n =
      hashNoise2D(Math.floor(x / 4), Math.floor(z / 4), opts.seed) * 0.6 +
      hashNoise2D(Math.floor(x / 16), Math.floor(z / 16), opts.seed + 1) * 0.4;
    const scale = opts.heightScale ? opts.heightScale(x, z) : 1;
    pos.setY(i, n * opts.amplitude * scale);
    const painted = opts.paint ? opts.paint(x, z) : null;
    if (painted) {
      c.copy(painted);
    } else {
      c.lerpColors(opts.colorA, opts.colorB, n);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
