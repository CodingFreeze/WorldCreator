import * as THREE from "three";
import { Rng } from "@engine/core/Rng";
import { createHumanoid, animateHumanoid, type HumanoidParts } from "@engine/procgen/humanoid";
import { NpcMind } from "@engine/npc/NpcMind";
import { currentStop } from "@engine/npc/schedule";
import { computeWitnesses, type Observer } from "@engine/npc/perception";
import { exchangeGossip, GOSSIP_RADIUS } from "@engine/npc/gossip";
import type { WorldEvent, WorldEventBus } from "@engine/npc/events";
import type { PhysicsWorld, Vec3 } from "@engine/physics/PhysicsWorld";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { NpcDef } from "./npcs";

const NPC_WALK_SPEED = 1.3;
const ARRIVE_DIST = 0.8;
const SHUN_RADIUS = 4;
const GOSSIP_COOLDOWN_HOURS = 1;

interface NpcEntity {
  def: NpcDef;
  mind: NpcMind;
  parts: HumanoidParts;
  facing: number;
  walkPhase: number;
  lineCounter: number;
  /** Witness flash indicator. */
  alertSprite: THREE.Sprite;
  alertTimer: number;
}

function makeAlertSprite(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#e84a2f";
    ctx.font = "bold 52px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("!", 32, 50);
  }
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.setScalar(0.5);
  sprite.visible = false;
  return sprite;
}

/**
 * Runtime for the village roster: schedule-driven movement, witnessing via
 * the perception system, proximity gossip, shun/greet behavior, dialogue
 * lookup. Reads minds; only events write them.
 */
export class VillageNpcs {
  readonly entities: NpcEntity[] = [];
  private readonly gossipLast = new Map<string, number>();

  constructor(
    scene: THREE.Scene,
    defs: NpcDef[],
    private readonly physics: PhysicsWorld,
    bus: WorldEventBus,
    private readonly playerCollider: RAPIER.Collider,
  ) {
    for (const def of defs) {
      const parts = createHumanoid(def.colors, def.id === "posy" ? 0.7 : 1);
      const start = def.schedule[0];
      if (!start) throw new Error(`npc ${def.id} has empty schedule`);
      parts.group.position.set(start.x, 0, start.z);
      scene.add(parts.group);
      const alertSprite = makeAlertSprite();
      alertSprite.position.y = 2.0;
      parts.group.add(alertSprite);
      this.entities.push({
        def,
        mind: new NpcMind(def.id),
        parts,
        facing: 0,
        walkPhase: 0,
        lineCounter: 0,
        alertSprite,
        alertTimer: 0,
      });
    }
    bus.subscribe((event) => this.onEvent(event));
  }

  private observers(): Observer[] {
    return this.entities.map((e) => ({
      id: e.def.id,
      x: e.parts.group.position.x,
      z: e.parts.group.position.z,
      facing: e.facing,
    }));
  }

  private onEvent(event: WorldEvent): void {
    const witnesses = computeWitnesses(event, this.observers(), (fx, fz, tx, tz) =>
      this.physics.hasLineOfSight({ x: fx, y: 0, z: fz }, { x: tx, y: 0, z: tz }, this.playerCollider),
    );
    for (const id of witnesses) {
      const entity = this.entities.find((e) => e.def.id === id);
      if (!entity) continue;
      entity.mind.witness(event);
      entity.alertTimer = 2;
    }
  }

  update(dt: number, hour: number, totalHours: number, playerPos: Vec3): void {
    for (const e of this.entities) {
      const p = e.parts.group.position;
      const distPlayer = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);

      let target = currentStop(e.def.schedule, hour);
      let speed = NPC_WALK_SPEED;
      let tx = target.x;
      let tz = target.z;

      // Frightened or disgusted villagers keep their distance.
      if (e.mind.attitude === "hostile" && distPlayer < SHUN_RADIUS) {
        tx = p.x + (p.x - playerPos.x);
        tz = p.z + (p.z - playerPos.z);
        speed = NPC_WALK_SPEED * 1.7;
      }

      const dx = tx - p.x;
      const dz = tz - p.z;
      const dist = Math.hypot(dx, dz);
      let moving = false;
      if (dist > ARRIVE_DIST) {
        moving = true;
        e.facing = Math.atan2(dx, dz);
        p.x += (dx / dist) * speed * dt;
        p.z += (dz / dist) * speed * dt;
        e.walkPhase += dt * 7;
      } else if (distPlayer < 3.5 && e.mind.attitude !== "hostile") {
        // Idle and player nearby: turn to face them (politeness is free).
        e.facing = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
      }
      e.parts.group.rotation.y = e.facing;
      animateHumanoid(e.parts, moving ? e.walkPhase : e.walkPhase + dt, moving ? 1 : 0);

      if (e.alertTimer > 0) {
        e.alertTimer -= dt;
        e.alertSprite.visible = e.alertTimer > 0;
      }
    }

    // Proximity gossip with per-pair cooldown.
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i]!;
        const b = this.entities[j]!;
        const pa = a.parts.group.position;
        const pb = b.parts.group.position;
        if (Math.hypot(pa.x - pb.x, pa.z - pb.z) > GOSSIP_RADIUS) continue;
        const key = `${a.def.id}|${b.def.id}`;
        const last = this.gossipLast.get(key) ?? -Infinity;
        if (totalHours - last < GOSSIP_COOLDOWN_HOURS) continue;
        this.gossipLast.set(key, totalHours);
        exchangeGossip(a.mind, b.mind, totalHours);
      }
    }
  }

  /** Nearest conversable NPC within reach, or null. */
  nearestTo(playerPos: Vec3, maxDist = 2.4): NpcEntity | null {
    let best: NpcEntity | null = null;
    let bestDist = maxDist;
    for (const e of this.entities) {
      const p = e.parts.group.position;
      const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
      if (d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  /** Greeting line for the NPC's current view of the player. */
  greetingFor(entity: NpcEntity, rng: Rng): string {
    const lines = entity.def.lines[entity.mind.attitude];
    const line = lines[entity.lineCounter % lines.length] ?? "...";
    entity.lineCounter++;
    const rumor =
      entity.mind.knowsOnlyByRumor && entity.mind.attitude !== "neutral"
        ? `${entity.def.rumorLine} `
        : "";
    void rng;
    return rumor + line;
  }
}
