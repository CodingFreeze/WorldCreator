import * as THREE from "three";
import { GameClock } from "@engine/core/GameClock";
import { FixedStepLoop } from "@engine/core/FixedStepLoop";
import { ActionMap } from "@engine/input/ActionMap";
import { bindDomInput } from "@engine/input/domBindings";
import { createRenderer, bindResize } from "@engine/render/createRenderer";
import { GoldenHourRig } from "@engine/render/GoldenHourRig";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { CharacterController } from "@engine/character/CharacterController";
import { ThirdPersonCamera } from "@engine/character/ThirdPersonCamera";
import { createGroundPatch, hashNoise2D } from "@engine/procgen/groundPatch";

const BINDINGS = {
  forward: ["KeyW"],
  back: ["KeyS"],
  left: ["KeyA"],
  right: ["KeyD"],
  jump: ["Space"],
} as const;

export async function bootDevScene(container: HTMLElement): Promise<void> {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  bindResize(renderer, camera);

  const clock = new GameClock({ dayLengthSec: 120, startHour: 9 });
  const rig = new GoldenHourRig(scene);

  // Ground: visual mesh is gently displaced; physics uses a flat slab.
  // Amplitude small enough that controller snap-to-ground absorbs it.
  scene.add(
    createGroundPatch({
      size: 120,
      segments: 60,
      seed: 7,
      amplitude: 0.6,
      colorA: new THREE.Color(0x5a7d3a),
      colorB: new THREE.Color(0x8aa85a),
    }),
  );

  const physics = await PhysicsWorld.create();
  physics.addFixedCuboid({ x: 0, y: -0.5, z: 0 }, { x: 60, y: 0.5, z: 60 });

  // Scatter physics-backed boxes to test collision + shadows.
  const boxGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  for (let i = 0; i < 25; i++) {
    const x = (hashNoise2D(i, 0, 11) - 0.5) * 80;
    const z = (hashNoise2D(0, i, 13) - 0.5) * 80;
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.08 + hashNoise2D(i, i, 5) * 0.05, 0.5, 0.55),
      flatShading: true,
    });
    const box = new THREE.Mesh(boxGeo, mat);
    box.position.set(x, 1.3, z);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
    physics.addFixedCuboid({ x, y: 1.3, z }, { x: 0.7, y: 0.7, z: 0.7 });
  }

  // Player: capsule mesh + kinematic controller.
  const char = new CharacterController(physics, { x: 0, y: 2, z: 0 });
  const playerMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.0, 4, 12),
    new THREE.MeshLambertMaterial({ color: 0xc46a4a, flatShading: true }),
  );
  playerMesh.castShadow = true;
  scene.add(playerMesh);

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
    },
    render: (_alpha, _dt) => {
      const d = input.drainMouseDelta();
      tpCamera.addLook(d.x, d.y);
      const p = char.position;
      playerMesh.position.set(p.x, p.y, p.z);
      tpCamera.update(p);
      rig.update(clock, playerMesh.position);
      renderer.render(scene, camera);
    },
  });
  loop.start();
}
