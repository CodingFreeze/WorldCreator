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
import { PlayerAvatar } from "@engine/character/PlayerAvatar";
import { WorldEventBus } from "@engine/npc/events";
import { Health } from "@engine/combat/Health";
import { PlayerCombat } from "@engine/combat/PlayerCombat";
import { Projectiles } from "@engine/combat/Projectiles";
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
import { installDevHooks } from "./devHooks";
import { combatFixedStep } from "./combatLoop";

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
  const avatar = new PlayerAvatar(scene, {
    skin: "#e8b890",
    shirt: "#7a4a2a",
    pants: "#4a3a2a",
    hair: "#3a2a1a",
  });

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

  const combatDeps = {
    input, combat, avatar, enemies, npcs, projectiles, bursts, playerHealth, hud,
    dialogueVisible: () => dialogue.visible,
    emit,
  };

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

      const moving = avatar.advance(step, move);
      if (moving && dialogue.visible) dialogue.hide();

      const playerPos = char.position;
      chickens.update(step, playerPos);
      npcs.update(step, clock.hour, clock.totalHoursElapsed, playerPos);

      // Combat: attacks aim where the camera looks.
      const aimFacing = Math.atan2(-Math.sin(tpCamera.yaw), -Math.cos(tpCamera.yaw));
      combatFixedStep(combatDeps, step, playerPos, fwd, aimFacing);

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
      const moving =
        input.isDown("forward") || input.isDown("back") || input.isDown("left") || input.isDown("right");
      avatar.sync(p, dt, moving);
      tpCamera.update(p);
      rig.update(clock, avatar.parts.group.position);
      updateWindows(village.windows, clock.daylight01);

      // Glowmoss shimmer while the fetch is on.
      moss.visible = questLog.isAt("remedy", "fetch");
      if (moss.visible) {
        moss.rotation.y += dt * 1.5;
        moss.position.y = 0.35 + Math.sin(clock.totalHoursElapsed * 6) * 0.08;
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

  installDevHooks({ char, questLog, coins: () => coins, npcs, chickens });

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
