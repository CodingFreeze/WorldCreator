import * as THREE from "three";

export interface ProjectileSpec {
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  ttl: number;
  radius: number;
  color: string;
  damage: number;
  /** Who fired it — projectiles never hit their own side. */
  side: "player" | "enemy";
}

interface Projectile extends ProjectileSpec {
  mesh: THREE.Mesh;
  alive: boolean;
}

export interface ProjectileHit {
  targetId: string;
  damage: number;
  x: number;
  z: number;
  side: "player" | "enemy";
}

export interface HitTarget {
  id: string;
  x: number;
  z: number;
  radius: number;
  side: "player" | "enemy";
}

/** Linear projectiles with sphere visuals and radius hit-tests. */
export class Projectiles {
  private readonly pool: Projectile[] = [];
  private readonly geo = new THREE.SphereGeometry(0.12, 6, 5);

  constructor(private readonly scene: THREE.Scene) {}

  spawn(spec: ProjectileSpec): void {
    const mesh = new THREE.Mesh(
      this.geo,
      new THREE.MeshBasicMaterial({ color: spec.color }),
    );
    mesh.position.set(spec.x, spec.y, spec.z);
    this.scene.add(mesh);
    this.pool.push({ ...spec, mesh, alive: true });
  }

  /** Advance and collide; returns hits (each projectile hits once). */
  update(dt: number, targets: readonly HitTarget[]): ProjectileHit[] {
    const hits: ProjectileHit[] = [];
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        this.kill(p);
        continue;
      }
      p.x += p.dirX * p.speed * dt;
      p.z += p.dirZ * p.speed * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      for (const t of targets) {
        if (t.side === p.side) continue;
        if (Math.hypot(t.x - p.x, t.z - p.z) < t.radius + p.radius) {
          hits.push({ targetId: t.id, damage: p.damage, x: p.x, z: p.z, side: p.side });
          this.kill(p);
          break;
        }
      }
    }
    return hits;
  }

  private kill(p: Projectile): void {
    p.alive = false;
    this.scene.remove(p.mesh);
    (p.mesh.material as THREE.Material).dispose();
  }
}
