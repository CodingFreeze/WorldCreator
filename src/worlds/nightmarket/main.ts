import * as THREE from "three";
import { FixedStepLoop } from "@engine/core/FixedStepLoop";
import { ActionMap } from "@engine/input/ActionMap";
import { bindDomInput } from "@engine/input/domBindings";
import { createRenderer, bindResize } from "@engine/render/createRenderer";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { CharacterController } from "@engine/character/CharacterController";
import { ThirdPersonCamera } from "@engine/character/ThirdPersonCamera";
import { createHumanoid, animateHumanoid } from "@engine/procgen/humanoid";
import { DialoguePanel } from "@engine/ui/DialoguePanel";
import { Hud } from "@engine/ui/Hud";
import type { WorldHandle } from "@engine/core/World";
import { generateMarketLayout } from "./layout";
import { buildMarket, createVendorBot } from "./build";
import { RainSystem, SteamColumns } from "./effects";
import { DroneCore, droneSees, WAYPOINT_ARRIVE_DIST } from "./drone";
import { installMarketDevHooks } from "./devHooks";

const BINDINGS = {
  forward: ["KeyW"], back: ["KeyS"], left: ["KeyA"], right: ["KeyD"],
  jump: ["Space"], interact: ["KeyE"],
} as const;

const SEED = 2077;
const HACK_TIME = 3;

const VENDOR_LINES = [
  "WELCOME TO LUCKY NOODLE. BROTH IS 98.2% AUTHENTIC. THE REST IS LOVE. AND SOLVENT.",
  "RAIN AGAIN. GOOD FOR BUSINESS. BAD FOR MY JOINTS. I AM 70% JOINTS.",
  "THE DRONE? IGNORE IT. IT ONLY REPORTS CRIMES IT SEES. PHILOSOPHICALLY COMFORTING.",
  "A CUSTOMER ONCE HACKED ALL THREE TERMINALS. THE BACKROOM REMEMBERS. SO DO I.",
  "NO REFUNDS. TECHNICALLY NO PRICES EITHER. WE OPERATE ON VIBES AND CREDITS.",
];

/** Boot the Neon Night Market: rain, neon, credits, hacking, one nosy drone. */
export async function bootNightMarket(container: HTMLElement): Promise<WorldHandle> {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const renderer = createRenderer(canvas, 1.05);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a14);
  scene.fog = new THREE.Fog(0x0a0a14, 18, 70);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  const unbindResize = bindResize(renderer, camera);

  scene.add(new THREE.HemisphereLight(0x4a5070, 0x1a1a26, 2.2));
  const moon = new THREE.DirectionalLight(0x6a7aaa, 0.5);
  moon.position.set(20, 40, -10);
  scene.add(moon);

  const physics = await PhysicsWorld.create();
  const layout = generateMarketLayout(SEED);
  const market = buildMarket(scene, physics, layout);
  const rain = new RainSystem(scene);
  const steam = new SteamColumns(scene, market.steamSpots);

  const char = new CharacterController(physics, { x: 0, y: 1.5, z: -26 });
  const player = createHumanoid({
    skin: "#d8b090", shirt: "#1a2a3a", pants: "#14141f", hair: "#2a1a2a",
  });
  scene.add(player.group);
  let walkPhase = 0;
  let facing = 0;

  // Vendor robot.
  const vendor = createVendorBot();
  vendor.position.set(market.vendorPos.x, 0, market.vendorPos.z);
  scene.add(vendor);
  let vendorLine = 0;

  // Credits chips.
  const chipMat = new THREE.MeshBasicMaterial({ color: "#2ad8ff" });
  chipMat.toneMapped = false;
  const chips = layout.creditSpawns.map((s) => {
    const chip = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), chipMat);
    chip.position.set(s.x, 0.7, s.z);
    scene.add(chip);
    return { mesh: chip, taken: false };
  });
  let credits = 0;

  // Drone.
  const drone = new THREE.Group();
  const droneBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshLambertMaterial({ color: "#2a2a3a", flatShading: true }),
  );
  const droneEyeMat = new THREE.MeshBasicMaterial({ color: "#ff3a3a" });
  droneEyeMat.toneMapped = false;
  const droneEye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), droneEyeMat);
  droneEye.position.z = 0.3;
  const droneLight = new THREE.SpotLight("#ff5a5a", 8, 14, 0.5, 0.4);
  droneLight.position.set(0, 0, 0.2);
  drone.add(droneBody, droneEye, droneLight, droneLight.target);
  droneLight.target.position.set(0, -2, 4);
  drone.position.set(0, 4.2, -32);
  scene.add(drone);
  const droneCore = new DroneCore(layout.patrol.length);
  let droneFacing = 0;

  // Hacking state.
  const hacked = new Set<number>();
  let hackingIdx = -1;
  let hackProgress = 0;
  let doorOpen = false;
  let stashTaken = false;

  // Stash glow inside the backroom.
  const stashMat = new THREE.MeshBasicMaterial({ color: "#ffd23a" });
  stashMat.toneMapped = false;
  const stash = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), stashMat);
  stash.position.set(market.stashPos.x, 0.6, market.stashPos.z);
  scene.add(stash);

  const dialogue = new DialoguePanel(container);
  const hud = new Hud(container);
  hud.setCoins(0, "Credits");

  const input = new ActionMap(BINDINGS);
  const unbindInput = bindDomInput(input, canvas);
  const tpCamera = new ThirdPersonCamera(camera);
  tpCamera.yaw = Math.PI; // face up the street into the neon
  facing = Math.PI;
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
        if (dialogue.visible) dialogue.hide();
        if (hackingIdx >= 0) {
          hackingIdx = -1;
          hackProgress = 0;
        }
      }
      const p = char.position;

      // Credits pickup by proximity.
      for (const chip of chips) {
        if (chip.taken) continue;
        chip.mesh.rotation.y += step * 2.5;
        if (Math.hypot(chip.mesh.position.x - p.x, chip.mesh.position.z - p.z) < 1.0) {
          chip.taken = true;
          chip.mesh.visible = false;
          credits += 5;
          hud.setCoins(credits, "Credits");
        }
      }

      // Hacking progress.
      if (hackingIdx >= 0) {
        hackProgress += step;
        if (hackProgress >= HACK_TIME) {
          hacked.add(hackingIdx);
          hackingIdx = -1;
          hackProgress = 0;
          hud.toast(
            hacked.size === 3
              ? "All terminals breached. Somewhere, a door unlocks."
              : `Terminal breached (${hacked.size}/3).`,
          );
        }
      }

      // E: vendor talk, or start a hack.
      if (input.consumePressed("interact")) {
        const distVendor = Math.hypot(vendor.position.x - p.x, vendor.position.z - p.z);
        const termIdx = layout.terminals.findIndex(
          (t) => Math.hypot(t.x - p.x, t.z - p.z) < 1.8,
        );
        if (distVendor < 2.2) {
          dialogue.show("NOODLE-9000 — vendor unit", VENDOR_LINES[vendorLine % VENDOR_LINES.length] ?? "...");
          vendorLine++;
        } else if (termIdx >= 0 && !hacked.has(termIdx) && hackingIdx === -1) {
          hackingIdx = termIdx;
          hackProgress = 0;
        } else if (!stashTaken && doorOpen && Math.hypot(market.stashPos.x - p.x, market.stashPos.z - p.z) < 1.6) {
          stashTaken = true;
          stash.visible = false;
          credits += 50;
          hud.setCoins(credits, "Credits");
          hud.toast("The stash: 50 credits and a note — 'you didn't find this.'");
        } else if (dialogue.visible) {
          dialogue.hide();
        }
      }

      // Drone patrol + vision (hacking is the only crime it cares about).
      const wp = layout.patrol[droneCore.waypoint];
      if (wp) {
        const ddx = (droneCore.mode === "alarm" ? p.x : wp.x) - drone.position.x;
        const ddz = (droneCore.mode === "alarm" ? p.z : wp.z) - drone.position.z;
        const ddist = Math.hypot(ddx, ddz);
        const speed = droneCore.mode === "alarm" ? 5.5 : 2.8;
        if (ddist > 0.1) {
          drone.position.x += (ddx / ddist) * speed * step;
          drone.position.z += (ddz / ddist) * speed * step;
          droneFacing = Math.atan2(ddx, ddz);
          drone.rotation.y = droneFacing;
        }
        const sees =
          hackingIdx >= 0 && droneSees(drone.position.x, drone.position.z, droneFacing, p.x, p.z);
        const out = droneCore.update(step, ddist < WAYPOINT_ARRIVE_DIST, sees);
        if (out.alarmTriggered) {
          const fine = Math.min(credits, 15);
          credits -= fine;
          hud.setCoins(credits, "Credits");
          hud.toast(`DRONE ALARM. Fine issued: ${fine} credits. It is very smug about it.`);
          hackingIdx = -1;
          hackProgress = 0;
        }
      }
      drone.position.y = 4.2 + Math.sin(elapsed * 2) * 0.2;
      droneEyeMat.color.set(
        droneCore.mode === "alarm" ? "#ff2a2a" : droneCore.mode === "suspicious" ? "#ffaa2a" : "#ff5a5a",
      );

      // Backroom door slides once all three are hacked.
      if (hacked.size === 3 && !doorOpen) {
        doorOpen = true;
        physics.removeCollider(market.backroomCollider);
      }
      if (doorOpen && market.backroomDoor.position.y < 4.2) {
        market.backroomDoor.position.y += step * 1.5;
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
      rain.update(dt, player.group.position);
      steam.update(dt, elapsed);
      stash.rotation.y += dt;

      // Prompt.
      const distVendor = Math.hypot(vendor.position.x - p.x, vendor.position.z - p.z);
      const termIdx = layout.terminals.findIndex((t) => Math.hypot(t.x - p.x, t.z - p.z) < 1.8);
      let prompt: string | null = null;
      if (hackingIdx >= 0) {
        prompt = `hacking… ${Math.round((hackProgress / HACK_TIME) * 100)}% (don't move, mind the drone)`;
      } else if (dialogue.visible) {
        prompt = null;
      } else if (distVendor < 2.2) {
        prompt = "E — talk to NOODLE-9000";
      } else if (termIdx >= 0 && !hacked.has(termIdx)) {
        prompt = "E — hack terminal";
      } else if (doorOpen && !stashTaken && Math.hypot(market.stashPos.x - p.x, market.stashPos.z - p.z) < 1.6) {
        prompt = "E — the stash";
      }
      hud.setPrompt(prompt);

      renderer.render(scene, camera);
    },
  });
  loop.start();

  installMarketDevHooks({
    char,
    layout,
    credits: () => credits,
    hacked: () => [...hacked],
    droneMode: () => droneCore.mode,
    doorOpen: () => doorOpen,
    chips: () =>
      chips.filter((c) => !c.taken).map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
    stashPos: () => market.stashPos,
  });

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
