import type { ActionMap } from "@engine/input/ActionMap";
import type { PlayerCombat } from "@engine/combat/PlayerCombat";
import type { Health } from "@engine/combat/Health";
import type { Projectiles, HitTarget } from "@engine/combat/Projectiles";
import type { ParticleBursts } from "@engine/render/ParticleBursts";
import type { PlayerAvatar } from "@engine/character/PlayerAvatar";
import type { Vec3 } from "@engine/physics/PhysicsWorld";
import type { WorldEventType } from "@engine/npc/events";
import type { Hud } from "@engine/ui/Hud";
import type { EnemyHost } from "./enemies";
import type { VillageNpcs } from "./npcRuntime";

type Bindings = { melee: readonly string[]; bow: readonly string[]; bolt: readonly string[] };

export interface CombatLoopDeps {
  input: ActionMap<Bindings & Record<string, readonly string[]>>;
  combat: PlayerCombat;
  avatar: PlayerAvatar;
  enemies: EnemyHost;
  npcs: VillageNpcs;
  projectiles: Projectiles;
  bursts: ParticleBursts;
  playerHealth: Health;
  hud: Hud;
  dialogueVisible: () => boolean;
  emit: (type: WorldEventType, x: number, z: number, targetId?: string) => void;
}

/**
 * One fixed step of Hollowmere combat: player attacks (aimed where the
 * camera looks), projectile flight + hits, enemy AI, and the witnessed
 * villainy of swinging steel near a villager.
 */
export function combatFixedStep(
  d: CombatLoopDeps,
  step: number,
  playerPos: Vec3,
  fwd: { x: number; z: number },
  aimFacing: number,
): void {
  if (d.input.consumePressed("melee") && !d.dialogueVisible()) {
    const atk = d.combat.tryMelee();
    if (atk) {
      d.avatar.strike();
      d.avatar.facing = aimFacing;
      for (const enemy of d.enemies.inMeleeArc(playerPos, aimFacing)) {
        const result = d.enemies.damage(enemy.id, Math.round(1 * atk.damageMult));
        if (result === "killed") {
          d.emit("slew_monster", enemy.mesh.position.x, enemy.mesh.position.z);
        }
      }
      // Swinging steel at a villager is witnessed villainy.
      const villager = d.npcs.nearestTo(playerPos, 1.8);
      if (villager) {
        d.emit("attacked_villager", playerPos.x, playerPos.z, villager.def.id);
        d.hud.toast(`${villager.def.name} will not forget that.`);
      }
    }
  }
  if (d.input.consumePressed("bow")) {
    const atk = d.combat.tryBow();
    if (atk) {
      d.avatar.strike(0.18);
      d.projectiles.spawn({
        x: playerPos.x, y: 1.3, z: playerPos.z,
        dirX: fwd.x, dirZ: fwd.z,
        speed: 15, ttl: 2, radius: 0.12,
        color: "#d8c8a0",
        damage: Math.round(1 * atk.damageMult),
        side: "player",
      });
    }
  }
  if (d.input.consumePressed("bolt")) {
    const atk = d.combat.tryBolt();
    if (atk) {
      d.avatar.strike(0.3);
      d.bursts.spawn(playerPos.x, 1.4, playerPos.z, "#8a5ae8", 10, 2);
      d.projectiles.spawn({
        x: playerPos.x, y: 1.3, z: playerPos.z,
        dirX: fwd.x, dirZ: fwd.z,
        speed: 11, ttl: 2.5, radius: 0.2,
        color: "#a06ae8",
        damage: Math.round(2 * atk.damageMult),
        side: "player",
      });
    }
  }

  const targets: HitTarget[] = [
    { id: "player", x: playerPos.x, z: playerPos.z, radius: 0.5, side: "player" },
    ...d.enemies.hitTargets(),
  ];
  for (const hit of d.projectiles.update(step, targets)) {
    if (hit.side === "player") {
      const result = d.enemies.damage(hit.targetId, hit.damage);
      if (result === "killed") d.emit("slew_monster", hit.x, hit.z);
    } else if (hit.targetId === "player") {
      d.playerHealth.damage(hit.damage);
      d.bursts.spawn(playerPos.x, 1.2, playerPos.z, "#c44a2f");
    }
  }
  const contactDamage = d.enemies.update(step, playerPos);
  if (contactDamage > 0) d.playerHealth.damage(contactDamage);
  d.bursts.update(step);
}
