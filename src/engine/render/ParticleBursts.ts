import * as THREE from "three";

interface Burst {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

/** Tiny one-shot particle bursts (hits, casts, deaths). */
export class ParticleBursts {
  private bursts: Burst[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  spawn(x: number, y: number, z: number, color: string, count = 12, speed = 3): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      // Deterministic-enough scatter from index (visual only).
      const a = (i / count) * Math.PI * 2;
      const b = ((i * 7919) % count) / count;
      velocities[i * 3] = Math.cos(a) * speed * (0.4 + b * 0.6);
      velocities[i * 3 + 1] = 1.5 + b * speed;
      velocities[i * 3 + 2] = Math.sin(a) * speed * (0.4 + b * 0.6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.12,
      transparent: true,
      opacity: 1,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.bursts.push({ points, velocities, life: 0.6, maxLife: 0.6 });
  }

  update(dt: number): void {
    for (const b of this.bursts) {
      b.life -= dt;
      const pos = b.points.geometry.attributes.position;
      if (!pos) continue;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3] = (arr[i * 3] ?? 0) + (b.velocities[i * 3] ?? 0) * dt;
        arr[i * 3 + 1] = (arr[i * 3 + 1] ?? 0) + (b.velocities[i * 3 + 1] ?? 0) * dt;
        arr[i * 3 + 2] = (arr[i * 3 + 2] ?? 0) + (b.velocities[i * 3 + 2] ?? 0) * dt;
        b.velocities[i * 3 + 1] = (b.velocities[i * 3 + 1] ?? 0) - 9 * dt; // gravity
      }
      pos.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, b.life / b.maxLife);
      if (b.life <= 0) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
      }
    }
    this.bursts = this.bursts.filter((b) => b.life > 0);
  }
}
