import * as THREE from "three";
import { FixedStepLoop } from "@engine/core/FixedStepLoop";
import { Rng } from "@engine/core/Rng";
import { ActionMap } from "@engine/input/ActionMap";
import { bindDomInput } from "@engine/input/domBindings";
import { createRenderer, bindResize } from "@engine/render/createRenderer";
import { ParticleBursts } from "@engine/render/ParticleBursts";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { CharacterController } from "@engine/character/CharacterController";
import { ThirdPersonCamera } from "@engine/character/ThirdPersonCamera";
import { createHumanoid, animateHumanoid } from "@engine/procgen/humanoid";
import { Hud } from "@engine/ui/Hud";
import type { WorldHandle } from "@engine/core/World";
import { buildIsland, Ocean } from "./island";
import { createPalm, createRuins, createShrine, createChest, createRelic } from "./props";

const BINDINGS = {
  forward: ["KeyW"], back: ["KeyS"], left: ["KeyA"], right: ["KeyD"],
  jump: ["Space"], interact: ["KeyE"],
} as const;

const SEED = 7;

const RELIC_SPOTS: { x: number; z: number; hint: string }[] = [
  { x: 34, z: 8, hint: "east beach" },
  { x: -18, z: -24, hint: "the ruins" },
  { x: -6, z: 30, hint: "south cliff" },
];
const CHEST_SPOTS = [
  { x: 20, z: -28 },
  { x: -32, z: 12 },
];

/** Boot Windward Isle: sunny exploration, three relics, a waiting shrine. */
export async function bootWindward(container: HTMLElement): Promise<WorldHandle> {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const renderer = createRenderer(canvas, 1.15);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9adcf0);
  scene.fog = new THREE.Fog(0xbce8f4, 60, 180);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  const unbindResize = bindResize(renderer, camera);

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
  sun.position.set(40, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x8a9a6a, 0.9));

  const physics = await PhysicsWorld.create();
  const island = buildIsland(scene, physics, SEED);
  const ocean = new Ocean(scene);
  const bursts = new ParticleBursts(scene);

  // Vegetation: palms on the beach band, ruins, shrine at the peak.
  const rng = new Rng(SEED ^ 0x15a);
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(26, 44);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = island.heightAt(x, z);
    if (h < 0.2 || h > 3) continue;
    const palm = createPalm(rng);
    palm.position.set(x, h - 0.05, z);
    scene.add(palm);
    physics.addFixedCylinder({ x, y: h + 2, z }, 2, 0.18);
  }
  const ruins = createRuins(rng);
  const ruinsH = island.heightAt(-18, -24);
  ruins.position.set(-18, ruinsH, -24);
  scene.add(ruins);

  const shrine = createShrine();
  const peakH = island.heightAt(0, 0);
  shrine.group.position.set(0, peakH, 0);
  scene.add(shrine.group);

  // Relics + chests.
  const relics = RELIC_SPOTS.map((s) => {
    const mesh = createRelic();
    const h = island.heightAt(s.x, s.z);
    mesh.position.set(s.x, h + 1.0, s.z);
    scene.add(mesh);
    return { mesh, taken: false, hint: s.hint, x: s.x, z: s.z, baseY: h + 1.0 };
  });
  const chests = CHEST_SPOTS.map((s) => {
    const chest = createChest();
    const h = island.heightAt(s.x, s.z);
    chest.group.position.set(s.x, h, s.z);
    chest.group.rotation.y = rng.range(0, Math.PI * 2);
    scene.add(chest.group);
    return { ...chest, x: s.x, z: s.z, opened: false };
  });

  let pearls = 0;
  let relicsFound = 0;
  let shrineDone = false;

  const spawnH = island.heightAt(30, 20);
  const char = new CharacterController(physics, { x: 30, y: spawnH + 1.5, z: 20 });
  const player = createHumanoid({
    skin: "#e8b890", shirt: "#3a7a9a", pants: "#8a6a4a", hair: "#5a3a1a",
  });
  scene.add(player.group);
  let walkPhase = 0;
  let facing = 0;

  const hud = new Hud(container);
  hud.setCoins(0, "Pearls");
  hud.toast("Three relics are scattered across the isle. The shrine waits.");

  const input = new ActionMap(BINDINGS);
  const unbindInput = bindDomInput(input, canvas);
  const tpCamera = new ThirdPersonCamera(camera);
  tpCamera.yaw = Math.atan2(30, 20); // look inland at boot
  let elapsed = 0;

  const loop = new FixedStepLoop({
    fixedUpdate: (step) => {
      elapsed += step;
      const fwd = tpCamera.forwardDir();
      const move = { x: 0, z: 0 };
      if (input.isDown("forward")) { move.x += fwd.x; move.z += fwd.z; }
      if (input.isDown("back")) { move.x -= fwd.x; move.z -= fwd.z; }
      if (input.isDown("left")) { move.x += fwd.z; move.z -= fwd.x; }
      if (input.isDown("right")) { move.x -= fwd.z; move.z += fwd.x; }
      char.update(move, input.consumePressed("jump"), step);
      physics.step();

      const moving = move.x !== 0 || move.z !== 0;
      if (moving) {
        facing = Math.atan2(move.x, move.z);
        walkPhase += step * 9;
      }
      const p = char.position;

      // Relic pickup by proximity.
      for (const r of relics) {
        if (r.taken) continue;
        r.mesh.rotation.y += step * 2;
        r.mesh.position.y = r.baseY + Math.sin(elapsed * 2.4) * 0.15;
        if (Math.hypot(r.x - p.x, r.z - p.z) < 1.4) {
          r.taken = true;
          r.mesh.visible = false;
          relicsFound++;
          bursts.spawn(r.x, r.baseY, r.z, "#ffd23a", 16, 3);
          hud.toast(
            relicsFound === 3
              ? "All three relics found! Carry them to the shrine at the peak."
              : `Relic recovered (${relicsFound}/3).`,
          );
        }
      }

      // Chests.
      if (input.consumePressed("interact")) {
        for (const chest of chests) {
          if (chest.opened) continue;
          if (Math.hypot(chest.x - p.x, chest.z - p.z) < 1.8) {
            chest.opened = true;
            pearls += 10;
            hud.setCoins(pearls, "Pearls");
            bursts.spawn(chest.x, chest.group.position.y + 0.8, chest.z, "#e8f0ff", 14, 2.5);
            hud.toast("A chest of pearls! (+10)");
          }
        }
      }
      for (const chest of chests) {
        if (chest.opened && chest.lid.rotation.x > -1.7) chest.lid.rotation.x -= step * 3;
      }

      // Shrine.
      if (!shrineDone && relicsFound === 3 && Math.hypot(p.x, p.z) < 3.5) {
        shrineDone = true;
        shrine.beam.visible = true;
        (shrine.orb.material as THREE.MeshBasicMaterial).color.set("#aef0ff");
        (shrine.orb.material as THREE.MeshBasicMaterial).toneMapped = false;
        pearls += 30;
        hud.setCoins(pearls, "Pearls");
        bursts.spawn(0, peakH + 2, 0, "#aef0ff", 30, 5);
        hud.toast("The shrine wakes. Light pours into the sky. (+30 pearls)");
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
      ocean.update(elapsed);
      bursts.update(dt);
      if (shrineDone) shrine.beam.rotation.y += dt * 0.4;

      // Prompt.
      let prompt: string | null = null;
      const nearChest = chests.find(
        (chest) => !chest.opened && Math.hypot(chest.x - p.x, chest.z - p.z) < 1.8,
      );
      if (nearChest) prompt = "E — open the chest";
      else if (relicsFound < 3) {
        const next = relics.find((r) => !r.taken);
        if (next) prompt = `relics: ${relicsFound}/3 — try ${next.hint}`;
      } else if (!shrineDone) prompt = "carry the relics to the peak shrine";
      hud.setPrompt(prompt);

      renderer.render(scene, camera);
    },
  });
  loop.start();

  if (new URLSearchParams(location.search).has("dev")) {
    (window as unknown as Record<string, unknown>).__wcIsle = {
      teleport: (x: number, z: number) => char.setPosition({ x, y: island.heightAt(x, z) + 1.5, z }),
      playerPos: () => char.position,
      relics: () => relics.filter((r) => !r.taken).map((r) => ({ x: r.x, z: r.z })),
      relicsFound: () => relicsFound,
      pearls: () => pearls,
      shrineDone: () => shrineDone,
      chests: () => chests.filter((c) => !c.opened).map((c) => ({ x: c.x, z: c.z })),
      pressKey: (code: string) => {
        window.dispatchEvent(new KeyboardEvent("keydown", { code }));
        window.dispatchEvent(new KeyboardEvent("keyup", { code }));
      },
    };
  }

  return {
    dispose: () => {
      loop.stop();
      unbindInput();
      unbindResize();
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
