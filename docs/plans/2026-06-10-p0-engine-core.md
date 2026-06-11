# P0: Scaffold + Engine Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite+TS project with a working engine core — fixed-step loop, game clock, input, renderer with the locked aesthetic, Rapier physics, kinematic character controller, third-person camera — proven by a walkable flat-shaded test scene at 60 fps.

**Architecture:** `src/engine/` is world-agnostic with no imports from `src/worlds/`. Pure-logic modules (clock, loop, input mapping, camera math) are headless and vitest-covered; Three.js/DOM-touching modules (renderer, boot) are typecheck + browser-smoke verified. Physics uses `@dimforge/rapier3d-compat` (WASM inlined, bundler-friendly, runs headless in vitest).

**Tech Stack:** Three.js (pinned), Vite, TypeScript strict, pnpm, vitest, @dimforge/rapier3d-compat.

**Spec:** `docs/specs/2026-06-10-worldcreator-design.md`

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`

- [ ] **Step 1: Create files**

`.gitignore`:
```
node_modules/
dist/
*.local
```

`index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WorldCreator</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #1a1410; }
    #app { width: 100%; height: 100%; }
    canvas { display: block; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/main.ts` (stub, replaced in Task 9):
```ts
console.log("WorldCreator boot");
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@engine/*": ["src/engine/*"],
      "@hub/*": ["src/hub/*"],
      "@worlds/*": ["src/worlds/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
      "@hub": fileURLToPath(new URL("./src/hub", import.meta.url)),
      "@worlds": fileURLToPath(new URL("./src/worlds", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Note: `test` block requires the `vitest/config` types — use this exact import form instead if tsc complains: `import { defineConfig } from "vitest/config";` (re-exports Vite's defineConfig with the test field typed). Prefer the vitest/config form from the start.

- [ ] **Step 2: Init package + install deps (pin exact versions)**

Run:
```bash
pnpm init
pnpm add three @dimforge/rapier3d-compat
pnpm add -D typescript vite vitest @types/three
```

Then edit `package.json`: set `"private": true`, add `"packageManager"` pin (run `pnpm -v` and pin that, e.g. `"pnpm@11.x.x"` — LESSONS #81), remove `^` from `three` so the version is exact, and add scripts:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 3: Verify toolchain**

Run: `pnpm typecheck && pnpm test`
Expected: typecheck passes; vitest reports "no test files found" exit 0 (if vitest exits 1 on empty, add `--passWithNoTests` to the test script).

Run: `pnpm dev` (background), curl `http://localhost:5173` → HTML served. Kill dev server.

- [ ] **Step 4: Commit**

```bash
git add -A && git ls-files   # verify everything intended is staged (LESSONS #99)
git commit -m "feat: scaffold Vite+TS+vitest project with engine path aliases"
```

---

### Task 2: GameClock (day/night time)

**Files:**
- Create: `src/engine/core/GameClock.ts`
- Test: `src/engine/core/GameClock.test.ts`

- [ ] **Step 1: Write failing tests**

`src/engine/core/GameClock.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { GameClock } from "./GameClock";

describe("GameClock", () => {
  it("starts at the given hour", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 9 });
    expect(c.hour).toBeCloseTo(9);
  });

  it("advances proportionally: full dayLength = 24h wrap", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 9 });
    c.advance(600); // one full in-game day
    expect(c.hour).toBeCloseTo(9);
    expect(c.day).toBe(1);
  });

  it("half a day advances 12 hours", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 6 });
    c.advance(300);
    expect(c.hour).toBeCloseTo(18);
  });

  it("daylight01 is 0 at midnight, 1 at noon", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 0 });
    expect(c.daylight01).toBeCloseTo(0);
    c.advance(300); // -> 12:00
    expect(c.daylight01).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./GameClock`.

- [ ] **Step 3: Implement**

`src/engine/core/GameClock.ts`:
```ts
export interface GameClockOptions {
  /** Real seconds for one full in-game day. */
  dayLengthSec: number;
  /** In-game hour [0,24) at start. */
  startHour: number;
}

/** In-game time of day. Pure logic — no rendering imports. */
export class GameClock {
  private readonly dayLengthSec: number;
  /** Total elapsed in-game hours since start of day 0. */
  private totalHours: number;

  constructor(opts: GameClockOptions) {
    this.dayLengthSec = opts.dayLengthSec;
    this.totalHours = opts.startHour;
  }

  /** Advance by real-time seconds. */
  advance(realDtSec: number): void {
    this.totalHours += (realDtSec / this.dayLengthSec) * 24;
  }

  /** Hour of day [0,24). */
  get hour(): number {
    return ((this.totalHours % 24) + 24) % 24;
  }

  /** Whole days elapsed. */
  get day(): number {
    return Math.floor(this.totalHours / 24);
  }

  /** 0 at midnight, 1 at noon — cosine curve for light blending. */
  get daylight01(): number {
    return 0.5 - 0.5 * Math.cos((this.hour / 24) * Math.PI * 2);
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/ && git commit -m "feat: GameClock with day/night phase"
```

---

### Task 3: Fixed-timestep loop

**Files:**
- Create: `src/engine/core/FixedStepLoop.ts`
- Test: `src/engine/core/FixedStepLoop.test.ts`

- [ ] **Step 1: Write failing tests**

`src/engine/core/FixedStepLoop.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { FixedStepAccumulator } from "./FixedStepLoop";

describe("FixedStepAccumulator", () => {
  it("emits no steps when accumulated time < step", () => {
    const a = new FixedStepAccumulator(1 / 60);
    expect(a.tick(0.005)).toBe(0);
  });

  it("emits floor(acc/step) steps and keeps remainder", () => {
    const a = new FixedStepAccumulator(1 / 60);
    const steps = a.tick(3.5 / 60);
    expect(steps).toBe(3);
    // remainder 0.5 step -> alpha 0.5
    expect(a.alpha).toBeCloseTo(0.5);
  });

  it("clamps huge frames to maxSteps (spiral-of-death guard)", () => {
    const a = new FixedStepAccumulator(1 / 60, 5);
    const steps = a.tick(2.0); // 120 steps worth
    expect(steps).toBe(5);
    expect(a.alpha).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./FixedStepLoop`.

- [ ] **Step 3: Implement**

`src/engine/core/FixedStepLoop.ts`:
```ts
/** Pure accumulator for a fixed-timestep simulation. Testable headless. */
export class FixedStepAccumulator {
  private acc = 0;

  constructor(
    public readonly stepSec: number,
    public readonly maxSteps = 5,
  ) {}

  /** Feed a real frame delta; returns how many fixed steps to run. */
  tick(frameDtSec: number): number {
    this.acc += frameDtSec;
    let steps = Math.floor(this.acc / this.stepSec);
    if (steps > this.maxSteps) {
      steps = this.maxSteps;
      this.acc = this.stepSec; // drop backlog, keep one step of remainder
    }
    this.acc -= steps * this.stepSec;
    return steps;
  }

  /** Interpolation factor [0,1) of partial step remaining. */
  get alpha(): number {
    return this.acc / this.stepSec;
  }
}

export interface LoopCallbacks {
  /** Fixed-rate simulation update. */
  fixedUpdate: (stepSec: number) => void;
  /** Per-frame render with interpolation alpha. */
  render: (alpha: number, frameDtSec: number) => void;
}

/** requestAnimationFrame driver around the accumulator. Browser-only. */
export class FixedStepLoop {
  private readonly accumulator: FixedStepAccumulator;
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly cb: LoopCallbacks,
    stepSec = 1 / 60,
  ) {
    this.accumulator = new FixedStepAccumulator(stepSec);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.25);
      this.lastTime = now;
      const steps = this.accumulator.tick(dt);
      for (let i = 0; i < steps; i++) this.cb.fixedUpdate(this.accumulator.stepSec);
      this.cb.render(this.accumulator.alpha, dt);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/ && git commit -m "feat: fixed-timestep loop with spiral-of-death guard"
```

---

### Task 4: Input — action mapping

**Files:**
- Create: `src/engine/input/ActionMap.ts`, `src/engine/input/domBindings.ts`
- Test: `src/engine/input/ActionMap.test.ts`

Design: `ActionMap` is pure (testable); `domBindings.ts` is a thin DOM adapter (keydown/keyup/mousemove/pointerlock) that calls into it.

- [ ] **Step 1: Write failing tests**

`src/engine/input/ActionMap.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ActionMap } from "./ActionMap";

const bindings = {
  moveForward: ["KeyW", "ArrowUp"],
  jump: ["Space"],
  attack: ["Mouse0"],
} as const;

describe("ActionMap", () => {
  it("isDown reflects key state for any bound code", () => {
    const m = new ActionMap(bindings);
    expect(m.isDown("moveForward")).toBe(false);
    m.setKey("KeyW", true);
    expect(m.isDown("moveForward")).toBe(true);
    m.setKey("KeyW", false);
    m.setKey("ArrowUp", true);
    expect(m.isDown("moveForward")).toBe(true);
  });

  it("consumePressed fires once per press edge", () => {
    const m = new ActionMap(bindings);
    m.setKey("Space", true);
    expect(m.consumePressed("jump")).toBe(true);
    expect(m.consumePressed("jump")).toBe(false); // already consumed
    m.setKey("Space", false);
    m.setKey("Space", true);
    expect(m.consumePressed("jump")).toBe(true);
  });

  it("accumulates and drains mouse delta", () => {
    const m = new ActionMap(bindings);
    m.addMouseDelta(3, -2);
    m.addMouseDelta(1, 1);
    expect(m.drainMouseDelta()).toEqual({ x: 4, y: -1 });
    expect(m.drainMouseDelta()).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `pnpm test` — FAIL, cannot resolve `./ActionMap`.

- [ ] **Step 3: Implement**

`src/engine/input/ActionMap.ts`:
```ts
export type Bindings = Record<string, readonly string[]>;

/** Maps physical key/button codes to named actions. Pure logic. */
export class ActionMap<B extends Bindings = Bindings> {
  private readonly codeToActions = new Map<string, string[]>();
  private readonly down = new Set<string>(); // codes currently held
  private readonly pressedEdges = new Set<string>(); // actions pressed since last consume
  private mouseDX = 0;
  private mouseDY = 0;

  constructor(bindings: B) {
    for (const [action, codes] of Object.entries(bindings)) {
      for (const code of codes) {
        const list = this.codeToActions.get(code) ?? [];
        list.push(action);
        this.codeToActions.set(code, list);
      }
    }
  }

  setKey(code: string, isDown: boolean): void {
    const wasDown = this.down.has(code);
    if (isDown) this.down.add(code);
    else this.down.delete(code);
    if (isDown && !wasDown) {
      for (const action of this.codeToActions.get(code) ?? []) {
        this.pressedEdges.add(action);
      }
    }
  }

  isDown(action: keyof B & string): boolean {
    for (const [code, actions] of this.codeToActions) {
      if (actions.includes(action) && this.down.has(code)) return true;
    }
    return false;
  }

  /** True once per press edge, then cleared for that action. */
  consumePressed(action: keyof B & string): boolean {
    const had = this.pressedEdges.has(action);
    this.pressedEdges.delete(action);
    return had;
  }

  addMouseDelta(dx: number, dy: number): void {
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  drainMouseDelta(): { x: number; y: number } {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }
}
```

`src/engine/input/domBindings.ts`:
```ts
import type { ActionMap } from "./ActionMap";

/** Wires DOM events into an ActionMap. Returns an unbind function. */
export function bindDomInput(map: ActionMap, canvas: HTMLCanvasElement): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    map.setKey(e.code, true);
  };
  const onKeyUp = (e: KeyboardEvent) => map.setKey(e.code, false);
  const onMouseDown = (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    map.setKey(`Mouse${e.button}`, true);
  };
  const onMouseUp = (e: MouseEvent) => map.setKey(`Mouse${e.button}`, false);
  const onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === canvas) {
      map.addMouseDelta(e.movementX, e.movementY);
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);
  };
}
```

- [ ] **Step 4: Run tests + typecheck, verify pass**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/input/ && git commit -m "feat: action-mapped input with pure core and DOM adapter"
```

---

### Task 5: Renderer + golden-hour lighting rig

**Files:**
- Create: `src/engine/render/createRenderer.ts`, `src/engine/render/GoldenHourRig.ts`

No unit tests (GPU/DOM); verified by typecheck now and browser smoke in Task 9.

- [ ] **Step 1: Implement createRenderer**

`src/engine/render/createRenderer.ts`:
```ts
import * as THREE from "three";

/** Locked render settings: ACES filmic, sRGB output, soft shadows. */
export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  return renderer;
}

/** Keeps renderer + camera sized to the window. Returns unbind. */
export function bindResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
): () => void {
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  onResize();
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}
```

- [ ] **Step 2: Implement GoldenHourRig**

`src/engine/render/GoldenHourRig.ts`:
```ts
import * as THREE from "three";
import type { GameClock } from "@engine/core/GameClock";

/**
 * Dynamic day/night lighting: warm low-angle sun, sky hemisphere, fog.
 * update() repositions/retints from the GameClock — lighting stays in-engine
 * (spec §7): Blender never bakes light.
 */
export class GoldenHourRig {
  readonly sun: THREE.DirectionalLight;
  readonly sky: THREE.HemisphereLight;
  private readonly dayFog = new THREE.Color(0xf2d8b0);
  private readonly nightFog = new THREE.Color(0x1c2233);
  private readonly daySun = new THREE.Color(0xffd9a0);
  private readonly nightSun = new THREE.Color(0x4a5a8a);

  constructor(private readonly scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(this.daySun, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.sky = new THREE.HemisphereLight(0xbfd4ff, 0x6b5a3e, 0.7);
    scene.add(this.sun, this.sun.target, this.sky);
    scene.fog = new THREE.Fog(this.dayFog.clone(), 30, 160);
    scene.background = this.dayFog.clone();
  }

  /** Call once per frame. */
  update(clock: GameClock, focus: THREE.Vector3): void {
    const t = clock.daylight01; // 0 midnight .. 1 noon
    const sunAngle = ((clock.hour - 6) / 24) * Math.PI * 2; // rises ~6h
    this.sun.position.set(
      focus.x + Math.cos(sunAngle) * 50,
      Math.max(Math.sin(sunAngle) * 50, -10),
      focus.z + 20,
    );
    this.sun.target.position.copy(focus);
    this.sun.intensity = 0.05 + 2.2 * t;
    this.sun.color.lerpColors(this.nightSun, this.daySun, t);
    this.sky.intensity = 0.15 + 0.6 * t;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.lerpColors(this.nightFog, this.dayFog, t);
    (this.scene.background as THREE.Color).copy(fog.color);
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/render/ && git commit -m "feat: ACES renderer and dynamic golden-hour lighting rig"
```

---

### Task 6: Physics wrapper (Rapier)

**Files:**
- Create: `src/engine/physics/PhysicsWorld.ts`
- Test: `src/engine/physics/PhysicsWorld.test.ts`

`rapier3d-compat` inlines its WASM — works in vitest's node environment. `RAPIER.init()` is async and module-global; wrap once.

- [ ] **Step 1: Write failing tests**

`src/engine/physics/PhysicsWorld.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { PhysicsWorld } from "./PhysicsWorld";

describe("PhysicsWorld", () => {
  let physics: PhysicsWorld;

  beforeAll(async () => {
    physics = await PhysicsWorld.create();
  });

  it("a dynamic ball falls under gravity onto a fixed ground", () => {
    physics.addFixedCuboid({ x: 0, y: -0.5, z: 0 }, { x: 50, y: 0.5, z: 50 });
    const ball = physics.addDynamicBall({ x: 0, y: 5, z: 0 }, 0.5);
    for (let i = 0; i < 300; i++) physics.step();
    const pos = ball.translation();
    expect(pos.y).toBeLessThan(5); // fell
    expect(pos.y).toBeGreaterThan(0); // rests on ground, not through it
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `pnpm test` — FAIL, cannot resolve `./PhysicsWorld`.

- [ ] **Step 3: Implement**

`src/engine/physics/PhysicsWorld.ts`:
```ts
import RAPIER from "@dimforge/rapier3d-compat";

export type Vec3 = { x: number; y: number; z: number };

let rapierReady: Promise<void> | null = null;
function initRapier(): Promise<void> {
  rapierReady ??= RAPIER.init().then(() => undefined);
  return rapierReady;
}

/** Thin ownership wrapper around a Rapier world. Fixed 1/60 step. */
export class PhysicsWorld {
  static readonly STEP = 1 / 60;

  static async create(): Promise<PhysicsWorld> {
    await initRapier();
    return new PhysicsWorld(new RAPIER.World({ x: 0, y: -9.81, z: 0 }));
  }

  private constructor(readonly world: RAPIER.World) {
    this.world.timestep = PhysicsWorld.STEP;
  }

  step(): void {
    this.world.step();
  }

  /** Static box collider; halfExtents are half side lengths. */
  addFixedCuboid(pos: Vec3, halfExtents: Vec3): RAPIER.Collider {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z),
    );
    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z),
      body,
    );
  }

  addDynamicBall(pos: Vec3, radius: number): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z),
    );
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius), body);
    return body;
  }

  /** Kinematic capsule body for characters. Returns body + collider. */
  addKinematicCapsule(
    pos: Vec3,
    halfHeight: number,
    radius: number,
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x, pos.y, pos.z),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(halfHeight, radius),
      body,
    );
    return { body, collider };
  }

  createCharacterController(offset = 0.02): RAPIER.KinematicCharacterController {
    const c = this.world.createCharacterController(offset);
    c.enableAutostep(0.4, 0.2, true);
    c.enableSnapToGround(0.4);
    c.setApplyImpulsesToDynamicBodies(true);
    return c;
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: PASS. (If WASM init fails under node, check vitest `environment: "node"` and rapier3d-compat version; do NOT switch to the non-compat package.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/physics/ && git commit -m "feat: Rapier physics world wrapper with character primitives"
```

---

### Task 7: Kinematic character controller

**Files:**
- Create: `src/engine/character/CharacterController.ts`
- Test: `src/engine/character/CharacterController.test.ts`

Headless: moves on a ground plane, stays grounded, blocked by walls, jumps with gravity.

- [ ] **Step 1: Write failing tests**

`src/engine/character/CharacterController.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { PhysicsWorld } from "@engine/physics/PhysicsWorld";
import { CharacterController } from "./CharacterController";

describe("CharacterController", () => {
  let physics: PhysicsWorld;
  let char: CharacterController;

  beforeEach(async () => {
    physics = await PhysicsWorld.create();
    physics.addFixedCuboid({ x: 0, y: -0.5, z: 0 }, { x: 50, y: 0.5, z: 50 });
    char = new CharacterController(physics, { x: 0, y: 1.2, z: 0 });
  });

  const settle = (n: number, move = { x: 0, z: 0 }, jump = false) => {
    for (let i = 0; i < n; i++) {
      char.update(move, jump, PhysicsWorld.STEP);
      physics.step();
      jump = false;
    }
  };

  it("settles onto the ground and reports grounded", () => {
    settle(60);
    expect(char.grounded).toBe(true);
    expect(char.position.y).toBeGreaterThan(0.5);
    expect(char.position.y).toBeLessThan(1.5);
  });

  it("moves horizontally at walk speed", () => {
    settle(60);
    const x0 = char.position.x;
    settle(60, { x: 1, z: 0 }); // 1 second of full forward
    expect(char.position.x - x0).toBeGreaterThan(2); // walkSpeed 4 -> ~4m
  });

  it("is blocked by a wall", () => {
    physics.addFixedCuboid({ x: 2, y: 1.5, z: 0 }, { x: 0.2, y: 1.5, z: 5 });
    settle(60);
    settle(120, { x: 1, z: 0 });
    expect(char.position.x).toBeLessThan(2); // capsule stops at wall
  });

  it("jumps and lands", () => {
    settle(60);
    const restY = char.position.y;
    settle(1, { x: 0, z: 0 }, true);
    settle(15);
    expect(char.position.y).toBeGreaterThan(restY + 0.3); // airborne
    settle(120);
    expect(char.grounded).toBe(true); // landed
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `pnpm test` — FAIL, cannot resolve `./CharacterController`.

- [ ] **Step 3: Implement**

`src/engine/character/CharacterController.ts`:
```ts
import type RAPIER from "@dimforge/rapier3d-compat";
import { PhysicsWorld, type Vec3 } from "@engine/physics/PhysicsWorld";

export interface CharacterTuning {
  walkSpeed: number;
  jumpSpeed: number;
  gravity: number;
  capsuleHalfHeight: number;
  capsuleRadius: number;
}

const DEFAULT_TUNING: CharacterTuning = {
  walkSpeed: 4,
  jumpSpeed: 6.5,
  gravity: -18, // gamier than -9.81
  capsuleHalfHeight: 0.5,
  capsuleRadius: 0.35,
};

/** Kinematic capsule character driven by Rapier's KinematicCharacterController. */
export class CharacterController {
  private readonly body: RAPIER.RigidBody;
  private readonly collider: RAPIER.Collider;
  private readonly kcc: RAPIER.KinematicCharacterController;
  private verticalVel = 0;
  grounded = false;
  readonly tuning: CharacterTuning;

  constructor(physics: PhysicsWorld, spawn: Vec3, tuning?: Partial<CharacterTuning>) {
    this.tuning = { ...DEFAULT_TUNING, ...tuning };
    const made = physics.addKinematicCapsule(
      spawn,
      this.tuning.capsuleHalfHeight,
      this.tuning.capsuleRadius,
    );
    this.body = made.body;
    this.collider = made.collider;
    this.kcc = physics.createCharacterController();
  }

  /**
   * @param move desired horizontal direction, components in [-1,1] (world space)
   * @param jump true on the frame jump was pressed
   */
  update(move: { x: number; z: number }, jump: boolean, dtSec: number): void {
    if (this.grounded && jump) {
      this.verticalVel = this.tuning.jumpSpeed;
    }
    this.verticalVel += this.tuning.gravity * dtSec;
    // clamp terminal velocity
    if (this.verticalVel < -30) this.verticalVel = -30;

    const len = Math.hypot(move.x, move.z);
    const nx = len > 1 ? move.x / len : move.x;
    const nz = len > 1 ? move.z / len : move.z;

    const desired = {
      x: nx * this.tuning.walkSpeed * dtSec,
      y: this.verticalVel * dtSec,
      z: nz * this.tuning.walkSpeed * dtSec,
    };

    this.kcc.computeColliderMovement(this.collider, desired);
    const corrected = this.kcc.computedMovement();
    const pos = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    });

    this.grounded = this.kcc.computedGrounded();
    if (this.grounded && this.verticalVel < 0) this.verticalVel = 0;
  }

  get position(): Vec3 {
    return this.body.translation();
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test`
Expected: PASS. (Tuning thresholds in tests are deliberately loose — they assert behavior class, not exact values.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/character/CharacterController.ts src/engine/character/CharacterController.test.ts
git commit -m "feat: kinematic character controller with jump and grounding"
```

---

### Task 8: Third-person camera

**Files:**
- Create: `src/engine/character/ThirdPersonCamera.ts`
- Test: `src/engine/character/ThirdPersonCamera.test.ts`

Pure math core (`computeCameraPose`) + thin class that applies it to a THREE camera.

- [ ] **Step 1: Write failing tests**

`src/engine/character/ThirdPersonCamera.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeCameraPose, clampPitch } from "./ThirdPersonCamera";

describe("computeCameraPose", () => {
  it("sits behind the target along -yaw at pitch 0", () => {
    const pose = computeCameraPose({ x: 0, y: 0, z: 0 }, 0, 0, 5, 1.5);
    expect(pose.position.x).toBeCloseTo(0);
    expect(pose.position.z).toBeCloseTo(5); // yaw 0 -> camera at +z
    expect(pose.position.y).toBeCloseTo(1.5);
    expect(pose.lookAt.y).toBeCloseTo(1.5);
  });

  it("orbits with yaw", () => {
    const pose = computeCameraPose({ x: 0, y: 0, z: 0 }, Math.PI / 2, 0, 5, 1.5);
    expect(pose.position.x).toBeCloseTo(5);
    expect(pose.position.z).toBeCloseTo(0, 5);
  });

  it("rises with positive pitch", () => {
    const pose = computeCameraPose({ x: 0, y: 0, z: 0 }, 0, 0.5, 5, 1.5);
    expect(pose.position.y).toBeGreaterThan(1.5);
  });
});

describe("clampPitch", () => {
  it("clamps to [-0.2, 1.2] rad", () => {
    expect(clampPitch(2)).toBeCloseTo(1.2);
    expect(clampPitch(-1)).toBeCloseTo(-0.2);
    expect(clampPitch(0.5)).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `pnpm test` — FAIL, cannot resolve `./ThirdPersonCamera`.

- [ ] **Step 3: Implement**

`src/engine/character/ThirdPersonCamera.ts`:
```ts
import * as THREE from "three";
import type { Vec3 } from "@engine/physics/PhysicsWorld";

export interface CameraPose {
  position: Vec3;
  lookAt: Vec3;
}

export const PITCH_MIN = -0.2;
export const PITCH_MAX = 1.2;

export function clampPitch(pitch: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
}

/** Orbit pose: yaw 0 puts the camera at +z looking toward -z. Pure math. */
export function computeCameraPose(
  target: Vec3,
  yaw: number,
  pitch: number,
  distance: number,
  heightOffset: number,
): CameraPose {
  const horiz = distance * Math.cos(pitch);
  const lookAt = { x: target.x, y: target.y + heightOffset, z: target.z };
  return {
    position: {
      x: target.x + Math.sin(yaw) * horiz,
      y: lookAt.y + distance * Math.sin(pitch),
      z: target.z + Math.cos(yaw) * horiz,
    },
    lookAt,
  };
}

const MOUSE_SENS = 0.0025;

/** Stateful orbit camera fed by mouse deltas. Thin over the pure core. */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = 0.35;
  distance = 6;
  heightOffset = 1.5;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  addLook(dx: number, dy: number): void {
    this.yaw -= dx * MOUSE_SENS;
    this.pitch = clampPitch(this.pitch + dy * MOUSE_SENS);
  }

  /** Direction the character should move for "forward" input (camera-relative). */
  forwardDir(): { x: number; z: number } {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  update(target: Vec3): void {
    const pose = computeCameraPose(
      target,
      this.yaw,
      this.pitch,
      this.distance,
      this.heightOffset,
    );
    this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.camera.lookAt(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z);
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/character/ThirdPersonCamera.ts src/engine/character/ThirdPersonCamera.test.ts
git commit -m "feat: third-person orbit camera with pure pose math"
```

---

### Task 9: Boot test scene (integration)

**Files:**
- Create: `src/engine/procgen/groundPatch.ts`, `src/devscene/main.ts` → wired from `src/main.ts` (replace stub)

A walkable proving ground: noise-displaced vertex-colored ground, scattered boxes (physics-backed), capsule player mesh, day/night cycling. This file is integration glue — no unit tests; browser smoke verifies.

- [ ] **Step 1: Implement procedural ground patch**

`src/engine/procgen/groundPatch.ts`:
```ts
import * as THREE from "three";

/** Deterministic pseudo-noise (no Math.random — reproducible worlds). */
export function hashNoise2D(x: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s); // [0,1)
}

export interface GroundPatchOptions {
  size: number;
  segments: number;
  seed: number;
  /** max vertical displacement */
  amplitude: number;
  colorA: THREE.Color; // low
  colorB: THREE.Color; // high
}

/** Flat-shaded, vertex-colored, gently rolling ground plane. */
export function createGroundPatch(opts: GroundPatchOptions): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(opts.size, opts.size, opts.segments, opts.segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  if (!pos) throw new Error("plane geometry missing position attribute");
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n =
      hashNoise2D(Math.floor(x / 4), Math.floor(z / 4), opts.seed) * 0.6 +
      hashNoise2D(Math.floor(x / 16), Math.floor(z / 16), opts.seed + 1) * 0.4;
    pos.setY(i, n * opts.amplitude);
    c.lerpColors(opts.colorA, opts.colorB, n);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
```

- [ ] **Step 2: Implement dev scene boot**

`src/devscene/main.ts`:
```ts
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
  // Amplitude is small enough (0.6m over 4m cells) that snap-to-ground absorbs it.
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
```

`src/main.ts` (replace stub):
```ts
import { bootDevScene } from "./devscene/main";

const app = document.getElementById("app");
if (!app) throw new Error("#app not found");
bootDevScene(app).catch((err) => {
  console.error("boot failed", err);
});
```

- [ ] **Step 3: Verify all gates**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all PASS, build emits dist/.

- [ ] **Step 4: Browser smoke (real runtime — LESSONS #55)**

Run: `pnpm dev` in background. Open `http://localhost:5173` with the browse skill or Chrome:
- Scene renders: rolling green ground, warm boxes, fog, shadows. Zero console errors.
- Click canvas (pointer lock), WASD walks, mouse orbits, Space jumps, boxes block movement.
- Day/night cycles visibly over ~2 min.
- FPS at ~60 (check via brief `requestAnimationFrame` counter in console or devtools performance).

Capture a screenshot to `/tmp/` (NOT the project tree — LESSONS #69) for the record.

- [ ] **Step 5: Commit**

```bash
git add -A && git ls-files | tail -20   # verify staged
git commit -m "feat: walkable dev scene integrating loop, input, physics, camera, lighting"
```

---

### Task 10: Blender MCP setup (operator-assisted, non-blocking)

**Files:** none in repo (environment config). Document outcome in `docs/specs/2026-06-10-worldcreator-design.md` if anything deviates.

- [ ] **Step 1: Check Blender installed**

Run: `ls /Applications | grep -i blender || which blender`
If absent: STOP, report to operator — Blender install is operator's call (external software).

- [ ] **Step 2: Install Blender MCP**

Standard route: `blender-mcp` (ahujasid) — addon zip installed in Blender prefs + MCP server entry. Get operator confirmation before installing external code (LESSONS #17). Config: `claude mcp add blender uvx blender-mcp` (user scope) or project `.mcp.json`.

- [ ] **Step 3: Smoke test**

With Blender open + addon connected: create a cube via MCP, export GLB to `/tmp/test.glb`, confirm file exists. Document any path/config quirks.

- [ ] **Step 4: No commit** (no repo changes) — report status. Hero-asset work doesn't start until P2+, so failure here blocks nothing in P0–P1.

---

## Verification (end of P0)

1. `pnpm typecheck` — clean
2. `pnpm test` — all green (clock, loop, input, physics, character, camera)
3. `pnpm build` — succeeds
4. Browser smoke per Task 9 Step 4 — walkable scene, 60 fps, zero console errors
5. `git log --oneline` — one commit per task, conventional messages
6. Every `src/engine` file under 300 lines

## Out of scope for P0 (resists scope creep)

- NPC/opinion/gossip systems (P2), combat (P3), quests/save (P4)
- Hub world-select UI (the dev scene boots directly; hub shell lands P5 or when world #2 nears)
- GLB asset loading layer (lands with first hero asset, P2+)
- Audio, postprocessing passes beyond tone mapping
