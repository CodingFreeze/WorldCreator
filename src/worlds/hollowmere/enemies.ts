import * as THREE from "three";
import { Rng } from "@engine/core/Rng";
import { Health } from "@engine/combat/Health";
import {
  EnemyBrain,
  THORNLING_TUNING,
  EMBERWISP_TUNING,
} from "@engine/combat/EnemyBrain";
import type { Projectiles, HitTarget } from "@engine/combat/Projectiles";
import type { ParticleBursts } from "@engine/render/ParticleBursts";
import type { Vec3 } from "@engine/physics/PhysicsWorld";

export type EnemyKind = "thornling" | "emberwisp";

interface Enemy {
  id: string;
  kind: EnemyKind;
  brain: EnemyBrain;
  health: Health;
  mesh: THREE.Group;
  bob: number;
  respawnTimer: number;
  spawn: { x: number; z: number };
}

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/** Spiky briar imp — melee mob of the north woods. */
function thornlingMesh(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), lambert("#2f4a22"));
  body.position.y = 0.5;
  body.castShadow = true;
  g.add(body);
  for (let i = 0; i < 7; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 6), lambert("#1d3015"));
    const a = (i / 7) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.38, 0.5 + Math.sin(i * 2.1) * 0.2, Math.sin(a) * 0.38);
    spike.lookAt(spike.position.x * 2, spike.position.y, spike.position.z * 2);
    spike.rotateX(Math.PI / 2);
    g.add(spike);
  }
  const eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 7),
    new THREE.MeshBasicMaterial({ color: "#ffd23a" }),
  );
  eyeL.position.set(-0.12, 0.58, 0.36);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  g.add(eyeL, eyeR);
  return g;
}

/** Floating ember spirit — ranged caster. */
function emberwispMesh(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 9),
    new THREE.MeshBasicMaterial({ color: "#ff8c3a" }),
  );
  core.position.y = 1.4;
  g.add(core);
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshLambertMaterial({
      color: "#7a3a1a",
      flatShading: true,
      transparent: true,
      opacity: 0.55,
    }),
  );
  shell.position.y = 1.4;
  g.add(shell);
  return g;
}

const MELEE_DAMAGE = 1;
const WISP_DAMAGE = 1;
const RESPAWN_SEC = 25;

/**
 * Enemy population for the north woods: movement from EnemyBrain output,
 * health, player damage, respawns. Emits nothing itself — the world emits
 * slew_monster when a kill is reported.
 */
export class EnemyHost {
  readonly enemies: Enemy[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly projectiles: Projectiles,
    private readonly bursts: ParticleBursts,
    seed: number,
  ) {
    const rng = new Rng(seed);
    for (let i = 0; i < 4; i++) {
      this.add(`thorn${i}`, "thornling", rng.range(-22, 22), rng.range(-46, -32));
    }
    for (let i = 0; i < 2; i++) {
      this.add(`wisp${i}`, "emberwisp", rng.range(-18, 18), rng.range(-44, -34));
    }
  }

  private add(id: string, kind: EnemyKind, x: number, z: number): void {
    const mesh = kind === "thornling" ? thornlingMesh() : emberwispMesh();
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.enemies.push({
      id,
      kind,
      brain: new EnemyBrain(kind === "thornling" ? THORNLING_TUNING : EMBERWISP_TUNING),
      health: new Health(kind === "thornling" ? 3 : 4, 0.2),
      mesh,
      bob: 0,
      respawnTimer: 0,
      spawn: { x, z },
    });
  }

  /** Targets for player projectiles. */
  hitTargets(): HitTarget[] {
    return this.enemies
      .filter((e) => !e.health.dead)
      .map((e) => ({
        id: e.id,
        x: e.mesh.position.x,
        z: e.mesh.position.z,
        radius: 0.6,
        side: "enemy" as const,
      }));
  }

  /**
   * Damage an enemy by id. Returns "killed" | "hit" | "none".
   */
  damage(id: string, amount: number): "killed" | "hit" | "none" {
    const e = this.enemies.find((en) => en.id === id);
    if (!e || e.health.dead) return "none";
    if (!e.health.damage(amount)) return "none";
    const p = e.mesh.position;
    this.bursts.spawn(p.x, p.y + 0.8, p.z, e.kind === "thornling" ? "#5a8a3a" : "#ffb03a");
    if (e.health.dead) {
      e.mesh.visible = false;
      e.respawnTimer = RESPAWN_SEC;
      this.bursts.spawn(p.x, p.y + 0.6, p.z, "#e8e0c8", 20, 4);
      return "killed";
    }
    return "hit";
  }

  /** Enemies close enough for a player melee arc hit. */
  inMeleeArc(playerPos: Vec3, facing: number, range = 2.0, halfAngle = 1.1): Enemy[] {
    return this.enemies.filter((e) => {
      if (e.health.dead) return false;
      const dx = e.mesh.position.x - playerPos.x;
      const dz = e.mesh.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > range) return false;
      const angleTo = Math.atan2(dx, dz);
      let diff = angleTo - facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return Math.abs(diff) < halfAngle;
    });
  }

  /** Returns damage dealt to the player this tick. */
  update(dt: number, playerPos: Vec3): number {
    let playerDamage = 0;
    for (const e of this.enemies) {
      e.health.update(dt);
      if (e.health.dead) {
        if (e.respawnTimer > 0) {
          e.respawnTimer -= dt;
          if (e.respawnTimer <= 0) {
            e.health.revive();
            e.mesh.position.set(e.spawn.x, 0, e.spawn.z);
            e.mesh.visible = true;
            e.brain.state = "idle";
          }
        }
        continue;
      }

      const p = e.mesh.position;
      const dx = playerPos.x - p.x;
      const dz = playerPos.z - p.z;
      const dist = Math.hypot(dx, dz);
      const out = e.brain.update(dt, dist, true);

      if (out.moveToward !== 0 && dist > 0.01) {
        const speed = e.brain.tuning.speed * out.moveToward;
        p.x += (dx / dist) * speed * dt;
        p.z += (dz / dist) * speed * dt;
      }
      e.mesh.rotation.y = Math.atan2(dx, dz);

      // Idle hover/bob.
      e.bob += dt;
      if (e.kind === "emberwisp") {
        p.y = Math.sin(e.bob * 2.2) * 0.15;
      } else {
        const squash = 1 + Math.sin(e.bob * 6) * 0.04;
        e.mesh.scale.y = squash;
      }

      if (out.attack) {
        if (e.kind === "thornling") {
          if (dist < 1.8) {
            playerDamage += MELEE_DAMAGE;
            this.bursts.spawn(playerPos.x, 1.2, playerPos.z, "#c44a2f");
          }
        } else {
          this.projectiles.spawn({
            x: p.x,
            y: 1.4,
            z: p.z,
            dirX: dx / dist,
            dirZ: dz / dist,
            speed: 7,
            ttl: 2.5,
            radius: 0.15,
            color: "#ff7a2a",
            damage: WISP_DAMAGE,
            side: "enemy",
          });
        }
      }
    }
    return playerDamage;
  }
}
