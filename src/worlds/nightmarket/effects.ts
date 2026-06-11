import * as THREE from "three";

/** Looping rain: drops fall inside a column around the focus point. */
export class RainSystem {
  private readonly points: THREE.Points;
  private readonly velocities: Float32Array;
  private readonly count = 600;
  private readonly area = 30;
  private readonly height = 18;

  constructor(scene: THREE.Scene) {
    const positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.sin(i * 12.9898) * 0.5 + 0.5) * this.area - this.area / 2;
      positions[i * 3 + 1] = (Math.sin(i * 78.233) * 0.5 + 0.5) * this.height;
      positions[i * 3 + 2] = (Math.sin(i * 39.425) * 0.5 + 0.5) * this.area - this.area / 2;
      this.velocities[i] = 9 + (Math.sin(i * 3.7) * 0.5 + 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8a9ab8,
      size: 0.06,
      transparent: true,
      opacity: 0.6,
    });
    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
  }

  update(dt: number, focus: THREE.Vector3): void {
    this.points.position.x = focus.x;
    this.points.position.z = focus.z;
    const pos = this.points.geometry.attributes.position;
    if (!pos) return;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      arr[i * 3 + 1] = (arr[i * 3 + 1] ?? 0) - (this.velocities[i] ?? 10) * dt;
      if ((arr[i * 3 + 1] ?? 0) < 0) arr[i * 3 + 1] = this.height;
    }
    pos.needsUpdate = true;
  }
}

/** Rising steam columns above noodle stalls. */
export class SteamColumns {
  private readonly systems: { points: THREE.Points; base: { x: number; z: number } }[] = [];
  private readonly perColumn = 24;

  constructor(scene: THREE.Scene, spots: { x: number; z: number }[]) {
    for (const spot of spots) {
      const positions = new Float32Array(this.perColumn * 3);
      for (let i = 0; i < this.perColumn; i++) {
        positions[i * 3] = spot.x;
        positions[i * 3 + 1] = 1 + (i / this.perColumn) * 3;
        positions[i * 3 + 2] = spot.z;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xc8d0e0,
        size: 0.3,
        transparent: true,
        opacity: 0.35,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      this.systems.push({ points, base: spot });
    }
  }

  update(dt: number, time: number): void {
    for (const s of this.systems) {
      const pos = s.points.geometry.attributes.position;
      if (!pos) continue;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < this.perColumn; i++) {
        let y = (arr[i * 3 + 1] ?? 1) + dt * 0.8;
        if (y > 4.5) y = 1;
        arr[i * 3 + 1] = y;
        arr[i * 3] = s.base.x + Math.sin(time * 1.3 + i) * 0.15 * (y - 1);
        arr[i * 3 + 2] = s.base.z + Math.cos(time * 1.1 + i) * 0.15 * (y - 1);
      }
      pos.needsUpdate = true;
    }
  }
}
