import * as THREE from "three";
import { GameClock } from "@engine/core/GameClock";
import { FixedStepLoop } from "@engine/core/FixedStepLoop";
import { Rng } from "@engine/core/Rng";
import { ActionMap } from "@engine/input/ActionMap";
import { bindDomInput } from "@engine/input/domBindings";
import { createRenderer, bindResize } from "@engine/render/createRenderer";
import { GoldenHourRig } from "@engine/render/GoldenHourRig";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { CharacterController } from "@engine/character/CharacterController";
import { ThirdPersonCamera } from "@engine/character/ThirdPersonCamera";
import { createHumanoid, animateHumanoid } from "@engine/procgen/humanoid";
import { WorldEventBus } from "@engine/npc/events";
import { DialoguePanel } from "@engine/ui/DialoguePanel";
import { Hud } from "@engine/ui/Hud";
import { buildVillage, updateWindows } from "./buildWorld";
import { ChickenFlock } from "./chickens";
import { defineRoster } from "./npcs";
import { VillageNpcs } from "./npcRuntime";

const BINDINGS = {
  forward: ["KeyW"],
  back: ["KeyS"],
  left: ["KeyA"],
  right: ["KeyD"],
  jump: ["Space"],
  interact: ["KeyE"],
  mischief: ["KeyF"],
} as const;

export const WORLD_SEED = 1031;

/** Boot Hollowmere: village, villagers with opinions, chickens, dialogue. */
export async function bootHollowmere(container: HTMLElement): Promise<void> {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  bindResize(renderer, camera);

  const clock = new GameClock({ dayLengthSec: 480, startHour: 10 });
  const rig = new GoldenHourRig(scene);

  const physics = await PhysicsWorld.create();
  const village = buildVillage(scene, physics, WORLD_SEED);
  const chickens = new ChickenFlock(scene, village.layout.chickenSpawns, WORLD_SEED ^ 0xc0c0);

  const char = new CharacterController(physics, { x: 4, y: 1.5, z: 6 });
  const player = createHumanoid({
    skin: "#e8b890",
    shirt: "#7a4a2a",
    pants: "#4a3a2a",
    hair: "#3a2a1a",
  });
  scene.add(player.group);
  let walkPhase = 0;
  let facing = 0;

  const bus = new WorldEventBus();
  const npcs = new VillageNpcs(scene, defineRoster(village.layout), physics, bus, char.colliderRef);
  const dialogue = new DialoguePanel(container);
  const hud = new Hud(container);
  const lineRng = new Rng(WORLD_SEED ^ 0xd1a);

  const input = new ActionMap(BINDINGS);
  bindDomInput(input, canvas);
  const tpCamera = new ThirdPersonCamera(camera);

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

      const moving = move.x !== 0 || move.z !== 0;
      if (moving) {
        facing = Math.atan2(move.x, move.z);
        walkPhase += step * 9;
        if (dialogue.visible) dialogue.hide(); // walking away ends the chat
      }

      const playerPos = char.position;
      chickens.update(step, playerPos);
      npcs.update(step, clock.hour, clock.totalHoursElapsed, playerPos);

      // E: talk to the nearest villager.
      if (input.consumePressed("interact")) {
        const nearby = npcs.nearestTo(playerPos);
        if (nearby) {
          dialogue.show(
            `${nearby.def.name} — ${nearby.def.role}`,
            npcs.greetingFor(nearby, lineRng),
          );
        } else if (dialogue.visible) {
          dialogue.hide();
        }
      }

      // F: kick a chicken. The village remembers.
      if (input.consumePressed("mischief")) {
        const kicked = chickens.kickNearest(playerPos);
        if (kicked) {
          bus.emit({
            type: "kicked_chicken",
            actor: "player",
            x: kicked.x,
            z: kicked.z,
            timeHours: clock.totalHoursElapsed,
          });
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
      tpCamera.update(p);
      rig.update(clock, player.group.position);
      updateWindows(village.windows, clock.daylight01);

      const nearby = npcs.nearestTo(p);
      hud.setPrompt(
        dialogue.visible ? null : nearby ? `E — talk to ${nearby.def.name}` : null,
      );

      renderer.render(scene, camera);
    },
  });
  loop.start();
}
