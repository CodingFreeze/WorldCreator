import * as THREE from "three";
import { GameClock } from "@engine/core/GameClock";
import { FixedStepLoop } from "@engine/core/FixedStepLoop";
import { Rng } from "@engine/core/Rng";
import { ActionMap } from "@engine/input/ActionMap";
import { bindDomInput } from "@engine/input/domBindings";
import { createRenderer, bindResize } from "@engine/render/createRenderer";
import { GoldenHourRig } from "@engine/render/GoldenHourRig";
import { ParticleBursts } from "@engine/render/ParticleBursts";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { CharacterController } from "@engine/character/CharacterController";
import { ThirdPersonCamera } from "@engine/character/ThirdPersonCamera";
import { createHumanoid, animateHumanoid } from "@engine/procgen/humanoid";
import { WorldEventBus } from "@engine/npc/events";
import { Health } from "@engine/combat/Health";
import { PlayerCombat } from "@engine/combat/PlayerCombat";
import { Projectiles, type HitTarget } from "@engine/combat/Projectiles";
import { DialoguePanel } from "@engine/ui/DialoguePanel";
import { Hud } from "@engine/ui/Hud";
import { QuestLog } from "@engine/quest/QuestLog";
import { SaveSystem, type SaveData } from "@engine/save/SaveSystem";
import { buildVillage, updateWindows } from "./buildWorld";
import { ChickenFlock } from "./chickens";
import { defineRoster } from "./npcs";
import { VillageNpcs } from "./npcRuntime";
import { EnemyHost } from "./enemies";
import { questDialogueFor, tryCollectMoss, MOSS_POSITION, type QuestServices } from "./quest";

const BINDINGS = {
  forward: ["KeyW"],
  back: ["KeyS"],
  left: ["KeyA"],
  right: ["KeyD"],
  jump: ["Space"],
  interact: ["KeyE"],
  mischief: ["KeyF"],
  melee: ["Mouse0"],
  bow: ["Mouse2"],
  bolt: ["KeyQ"],
  save: ["KeyK"],
} as const;

export const WORLD_SEED = 1031;
const SPAWN = { x: 4, y: 1.5, z: 6 };

/** Boot Hollowmere: village, villagers with opinions, combat in the woods. */
export async function bootHollowmere(container: HTMLElement): Promise<import("@engine/core/World").WorldHandle> {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  const unbindResize = bindResize(renderer, camera);

  const saves = new SaveSystem();
  const saved = new URLSearchParams(location.search).has("fresh")
    ? null
    : saves.load("hollowmere");

  const clock = new GameClock({ dayLengthSec: 480, startHour: saved?.clockHours ?? 10 });
  const rig = new GoldenHourRig(scene);

  const physics = await PhysicsWorld.create();
  const village = buildVillage(scene, physics, WORLD_SEED);
  const chickens = new ChickenFlock(scene, village.layout.chickenSpawns, WORLD_SEED ^ 0xc0c0);

  const char = new CharacterController(physics, SPAWN);
  const player = createHumanoid({
    skin: "#e8b890",
    shirt: "#7a4a2a",
    pants: "#4a3a2a",
    hair: "#3a2a1a",
  });
  scene.add(player.group);
  let walkPhase = 0;
  let facing = 0;
  let swingTimer = 0;

  const bus = new WorldEventBus();
  const npcs = new VillageNpcs(scene, defineRoster(village.layout), physics, bus, char.colliderRef);
  const dialogue = new DialoguePanel(container);
  const hud = new Hud(container);
  hud.enableBars();
  const lineRng = new Rng(WORLD_SEED ^ 0xd1a);

  const bursts = new ParticleBursts(scene);
  const projectiles = new Projectiles(scene);
  const enemies = new EnemyHost(scene, projectiles, bursts, WORLD_SEED ^ 0xbad);
  const playerHealth = new Health(10);
  const combat = new PlayerCombat();

  // --- Quest: The Crabapple Remedy. ---
  const questLog = new QuestLog();
  let coins = 0;
  const moss = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 0),
    new THREE.MeshBasicMaterial({ color: "#5aff8a" }),
  );
  moss.position.set(MOSS_POSITION.x, 0.3, MOSS_POSITION.z);
  moss.visible = false;
  scene.add(moss);

  const questServices: QuestServices = {
    log: questLog,
    bus,
    nowHours: () => clock.totalHoursElapsed,
    playerPos: () => char.position,
    addCoins: (n) => {
      coins += n;
      hud.setCoins(coins);
    },
    toast: (msg) => hud.toast(msg),
    closeDialogue: () => dialogue.hide(),
  };

  // --- Restore save, if any. ---
  if (saved) {
    char.setPosition({ x: saved.player.x, y: saved.player.y, z: saved.player.z });
    playerHealth.current = saved.player.health;
    coins = saved.player.coins;
    questLog.restore(saved.quests);
    for (const e of npcs.entities) {
      const snap = saved.minds[e.def.id];
      if (snap) e.mind.restore(snap);
    }
  }
  hud.setCoins(coins);

  const buildSave = (): SaveData => {
    const p = char.position;
    const minds: SaveData["minds"] = {};
    for (const e of npcs.entities) minds[e.def.id] = e.mind.serialize();
    return {
      version: 1,
      worldId: "hollowmere",
      clockHours: clock.totalHoursElapsed,
      player: { x: p.x, y: p.y, z: p.z, health: playerHealth.current, coins },
      quests: questLog.serialize(),
      minds,
      flags: {},
    };
  };
  let autosaveTimer = 30;

  const input = new ActionMap(BINDINGS);
  const unbindInput = bindDomInput(input, canvas);
  const tpCamera = new ThirdPersonCamera(camera);

  const emit = (type: Parameters<WorldEventBus["emit"]>[0]["type"], x: number, z: number, targetId?: string) =>
    bus.emit({ type, actor: "player", x, z, timeHours: clock.totalHoursElapsed, targetId });

  const loop = new FixedStepLoop({
    fixedUpdate: (step) => {
      const fwd = tpCamera.forwardDir();
      const move = { x: 0, z: 0 };
      if (input.isDown("forward")) { move.x += fwd.x; move.z += fwd.z; }
      if (input.isDown("back")) { move.x -= fwd.x; move.z -= fwd.z; }
      if (input.isDown("left")) { move.x += fwd.z; move.z -= fwd.x; }
      if (input.isDown("right")) { move.x -= fwd.z; move.z += fwd.x; }
      char.update(move, input.consumePressed("jump"), step);
      physics.step();
      clock.advance(step);
      combat.update(step);
      playerHealth.update(step);

      const moving = move.x !== 0 || move.z !== 0;
      if (moving) {
        facing = Math.atan2(move.x, move.z);
        walkPhase += step * 9;
        if (dialogue.visible) dialogue.hide();
      }

      const playerPos = char.position;
      chickens.update(step, playerPos);
      npcs.update(step, clock.hour, clock.totalHoursElapsed, playerPos);

      // --- Combat input. Attacks aim where the camera looks. ---
      const aimFacing = Math.atan2(-Math.sin(tpCamera.yaw), -Math.cos(tpCamera.yaw));
      if (input.consumePressed("melee") && !dialogue.visible) {
        const atk = combat.tryMelee();
        if (atk) {
          swingTimer = 0.25;
          facing = aimFacing;
          for (const enemy of enemies.inMeleeArc(playerPos, aimFacing)) {
            const result = enemies.damage(enemy.id, Math.round(1 * atk.damageMult));
            if (result === "killed") {
              emit("slew_monster", enemy.mesh.position.x, enemy.mesh.position.z);
            }
          }
          // Swinging steel at a villager is witnessed villainy.
          const villager = npcs.nearestTo(playerPos, 1.8);
          if (villager) {
            emit("attacked_villager", playerPos.x, playerPos.z, villager.def.id);
            hud.toast(`${villager.def.name} will not forget that.`);
          }
        }
      }
      if (input.consumePressed("bow")) {
        const atk = combat.tryBow();
        if (atk) {
          swingTimer = 0.18;
          projectiles.spawn({
            x: playerPos.x, y: 1.3, z: playerPos.z,
            dirX: fwd.x, dirZ: fwd.z,
            speed: 15, ttl: 2, radius: 0.12,
            color: "#d8c8a0",
            damage: Math.round(1 * atk.damageMult),
            side: "player",
          });
        }
      }
      if (input.consumePressed("bolt")) {
        const atk = combat.tryBolt();
        if (atk) {
          swingTimer = 0.3;
          bursts.spawn(playerPos.x, 1.4, playerPos.z, "#8a5ae8", 10, 2);
          projectiles.spawn({
            x: playerPos.x, y: 1.3, z: playerPos.z,
            dirX: fwd.x, dirZ: fwd.z,
            speed: 11, ttl: 2.5, radius: 0.2,
            color: "#a06ae8",
            damage: Math.round(2 * atk.damageMult),
            side: "player",
          });
        }
      }

      // --- Projectiles & enemies. ---
      const targets: HitTarget[] = [
        { id: "player", x: playerPos.x, z: playerPos.z, radius: 0.5, side: "player" },
        ...enemies.hitTargets(),
      ];
      for (const hit of projectiles.update(step, targets)) {
        if (hit.side === "player") {
          const result = enemies.damage(hit.targetId, hit.damage);
          if (result === "killed") emit("slew_monster", hit.x, hit.z);
        } else if (hit.targetId === "player") {
          playerHealth.damage(hit.damage);
          bursts.spawn(playerPos.x, 1.2, playerPos.z, "#c44a2f");
        }
      }
      const contactDamage = enemies.update(step, playerPos);
      if (contactDamage > 0) playerHealth.damage(contactDamage);
      bursts.update(step);

      if (playerHealth.dead) {
        char.setPosition(SPAWN);
        playerHealth.revive();
        hud.toast("You wake by the well, aching and embarrassed.");
      }

      // E: collect quest items, else talk to the nearest villager.
      if (input.consumePressed("interact")) {
        if (tryCollectMoss(questServices, playerPos)) {
          moss.visible = false;
        } else {
          const nearby = npcs.nearestTo(playerPos);
          if (nearby) {
            const quest = questDialogueFor(nearby.def.id, questServices);
            if (quest) {
              dialogue.show(`${nearby.def.name} — ${nearby.def.role}`, quest.line, quest.choices);
            } else {
              dialogue.show(
                `${nearby.def.name} — ${nearby.def.role}`,
                npcs.greetingFor(nearby, lineRng),
              );
            }
          } else if (dialogue.visible) {
            dialogue.hide();
          }
        }
      }

      // Saving: manual (K) + autosave every 30s.
      autosaveTimer -= step;
      if (input.consumePressed("save") || autosaveTimer <= 0) {
        if (autosaveTimer > 0) hud.toast("Game saved.");
        autosaveTimer = 30;
        saves.save(buildSave());
      }

      // F: kick a chicken. The village remembers.
      if (input.consumePressed("mischief")) {
        const kicked = chickens.kickNearest(playerPos);
        if (kicked) {
          emit("kicked_chicken", kicked.x, kicked.z);
          hud.toast("The chicken will remember that. So will the village.");
        }
      }
    },
    render: (_alpha, dt) => {
      const d = input.drainMouseDelta();
      tpCamera.addLook(d.x, d.y);
      const p = char.position;
      player.group.position.set(p.x, p.y - 0.85, p.z);
      player.group.rotation.y = facing;
      const moving =
        input.isDown("forward") || input.isDown("back") || input.isDown("left") || input.isDown("right");
      animateHumanoid(player, moving ? walkPhase : walkPhase + dt, moving ? 1 : 0);
      if (swingTimer > 0) {
        swingTimer -= dt;
        player.rightArm.rotation.x = -2.1; // raised strike pose
      }
      tpCamera.update(p);
      rig.update(clock, player.group.position);
      updateWindows(village.windows, clock.daylight01);

      // Glowmoss shimmer while the fetch is on.
      moss.visible = questLog.isAt("remedy", "fetch");
      if (moss.visible) {
        moss.rotation.y += dt * 1.5;
        moss.position.y = 0.35 + Math.sin(walkPhase * 0.3 + clock.totalHoursElapsed * 4) * 0.08;
      }

      const nearby = npcs.nearestTo(p);
      const nearMoss =
        moss.visible && Math.hypot(p.x - MOSS_POSITION.x, p.z - MOSS_POSITION.z) < 2.2;
      hud.setPrompt(
        dialogue.visible
          ? null
          : nearMoss
            ? "E — gather the glowmoss"
            : nearby
              ? `E — talk to ${nearby.def.name}`
              : null,
      );
      hud.setBars(playerHealth.fraction, combat.flowFraction);

      renderer.render(scene, camera);
    },
  });
  loop.start();

  // E2E/dev hooks — only with ?dev=1. Lets tests teleport and inspect state.
  if (new URLSearchParams(location.search).has("dev")) {
    (window as unknown as Record<string, unknown>).__wc = {
      teleport: (x: number, z: number) => char.setPosition({ x, y: 1.5, z }),
      playerPos: () => char.position,
      questStage: () => questLog.stageOf("remedy"),
      coins: () => coins,
      npcPositions: () =>
        Object.fromEntries(
          npcs.entities.map((e) => [
            e.def.id,
            { x: e.parts.group.position.x, z: e.parts.group.position.z },
          ]),
        ),
      attitudes: () =>
        Object.fromEntries(npcs.entities.map((e) => [e.def.id, e.mind.attitude])),
      mindStats: () =>
        Object.fromEntries(
          npcs.entities.map((e) => [
            e.def.id,
            { morality: e.mind.morality, memories: e.mind.memories.size },
          ]),
        ),
      chickenPositions: () => chickens.positions(),
      pressKey: (code: string) => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code }));
        window.dispatchEvent(new KeyboardEvent("keyup", { code }));
      },
    };
  }

  return {
    dispose: () => {
      saves.save(buildSave()); // never lose progress on exit
      loop.stop();
      unbindInput();
      unbindResize();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
