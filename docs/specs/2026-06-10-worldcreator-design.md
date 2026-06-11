# WorldCreator — Design Spec

Date: 2026-06-10
Status: Approved (operator, 2026-06-10)

## 1. Vision

WorldCreator is a single deployed browser SPA presenting a collection of explorable,
playable 3D worlds, each built on one shared TypeScript/Three.js engine. The landing
screen is a world-select gallery (poster cards); selecting a world lazy-loads its
module into the live canvas.

World #1 is **Hollowmere** (working title): a whimsical British-fairytale action-RPG
inspired by the *feel and systems* of classic moral-choice fairytale RPGs — never
their IP. No copyrighted names, characters, maps, music, storylines, or logos.
Original names and content only. Tone: warm, charming, mischievous, dark-humored.
Lots of chickens.

The architectural showpiece is the **witnessed-actions reputation system**: NPCs form
opinions only from what they personally see (or hear second-hand via gossip), and the
world visibly responds.

## 2. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Shared engine core + thin world packages | Multi-week, multi-world project; world #2+ become mostly content |
| Hub | One SPA, lazy-loaded worlds | Single URL, seamless showcase; engine shared at runtime |
| Tooling | Vite + TypeScript | Rapier WASM, GLB pipeline, typed engine contracts across worlds |
| Physics | Rapier (`@dimforge/rapier3d-compat`) | Real collisions + kinematic character controller |
| Assets | Procedural-first; Blender MCP for hero assets | Procedural terrain/buildings/props/textures/lighting; GLB only for player character, key NPC archetypes, signature creatures |
| Concept art | ChatGPT image gen — design reference + hub posters only | Never runtime textures |
| Slice focus | Reputation AND combat | Both systems prove out in milestone 1, scoped simple |
| Camera | Third-person | Matches all reference games |
| Performance | 60 fps on a laptop | Budget gate for every phase |

## 3. Stack

- Three.js, version-pinned in package.json
- Vite + TypeScript (strict), pnpm, vitest
- Rapier physics (WASM)
- HTML/CSS overlay for UI/HUD (no in-canvas UI framework)
- localStorage + file export for saves
- Blender MCP (setup task) → GLB → engine asset layer

## 4. Repository layout

```
WorldCreator/
  src/
    engine/            # world-agnostic, no world imports
      core/            # app loop, fixed-step update, scene mgmt, game clock
      render/          # renderer, ACES tone mapping, lighting rig, fog, postfx
      input/           # keyboard/mouse abstraction, action mapping
      physics/         # rapier wrapper, colliders, queries
      character/       # kinematic controller + third-person camera
      npc/             # perception, opinion model, gossip, schedules
      dialogue/        # dialogue trees, opinion-gated line selection
      quest/           # quest state machines, moral forks, world flags
      combat/          # player style state machine, damage, enemy AI (BT-lite)
      procgen/         # noise, canvas textures, geometry builders, scatter
      assets/          # GLB loader + asset manifest
      save/            # versioned JSON snapshot, slots, export/import
      ui/              # HUD framework (HTML overlay), menus
    hub/               # world registry, select screen, lazy loader
    worlds/
      hollowmere/      # content only: terrain params, village layout,
                       # NPC roster, quests, items, dialogue data
  tools/               # blender export scripts, asset manifest generation
  assets/              # GLB heroes, hub poster art
  docs/
    specs/             # this doc + future specs
    WORLDS.md          # world roster + pitches
```

Rules: engine never imports from worlds. Worlds consume the engine's public API
only. Every functional file under 300 lines — split on breach.

## 5. Reputation system (the spine)

Pure TypeScript module with zero Three.js imports — headless unit-testable.

- **WorldEvent**: gameplay emits typed events (`theft`, `donation`,
  `attacked_villager`, `helped_npc`, `kept_promise`, `broke_promise`, …) with
  actor, target, position, timestamp onto a central event bus.
- **Perception**: computes witnesses per event — line-of-sight (raycast) + radius
  + facing. An NPC that didn't see it doesn't know it happened.
- **OpinionModel** (per NPC): scalars — morality-view, fear, affection — updated
  only by witnessed events and gossip. No global karma meter.
- **Gossip**: when NPC schedules bring two NPCs near each other, they exchange
  recent events second-hand at decayed weight with slight distortion. Reputation
  propagates socially — it "precedes you."
- **Consumers (read-only)**: dialogue line selection, shop pricing, greet/shun/flee
  behavior, quest gating, world flags. Consumers never write opinions.
- Combat emits WorldEvents too: villagers who watch you fight react accordingly.

## 6. Combat

- Player: state machine over three styles — melee (combo chain), ranged (bow),
  magic (bolt/blast) — with a shared flow meter and cancel-windows that allow
  weaving styles mid-encounter. Weaving is the hook; per-style depth comes later.
- Enemies: behavior-tree-lite. Slice ships 2 archetypes (melee mob + ranged
  caster). Signature creature (Blender-authored, original design) lands in P6.
- Feedback: hitstop, knockback, particles — minimum juice in slice.

## 7. Aesthetic (concrete discipline)

- Golden-hour key light + warm fog; ACES filmic tone mapping; subtle bloom.
- Low-poly flat-shaded geometry, vertex colors, canvas/noise-generated textures.
- Limited palette per biome; readable silhouettes.
- Whimsy through shape language — crooked chimneys, round doors, leaning fences —
  not asset count.
- Lighting stays fully in-engine and dynamic (day/night clock, reputation-reactive
  ambience). Blender contributes geometry/materials only, never baked lighting.

## 8. Save/load

Versioned JSON snapshot: player state, all NPC opinions, quest states, world
flags, game clock. localStorage slots + export/import as file. Schema version
field from day one; migrations on load.

## 9. Milestone 1 — vertical slice (definition of done)

Hub shell with one world card → loads Hollowmere:

1. Procedural village (~10 buildings) + surrounding woods, day/night clock
2. 6 NPCs with daily schedules, witnessed-actions opinions, gossip exchange
3. 1 quest with a moral fork; world visibly reacts (prices, greetings, dialogue)
4. All 3 combat styles (simple) vs 2 enemy archetypes in the woods
5. Chickens (interactive, opinion-relevant if kicked in view of villagers)
6. Save/load working
7. 60 fps on a laptop; no console errors

## 10. Phase plan

| Phase | Scope |
|---|---|
| P0 | Scaffold: Vite+TS+pnpm, engine core (loop, renderer, input, physics, character controller, camera), Blender MCP setup |
| P1 | Procgen toolkit + village scene + aesthetic lock (lighting/tone/palette) |
| P2 | NPC layer: schedules, perception, opinions, gossip, dialogue |
| P3 | Combat: 3 styles, weaving, 2 enemies |
| P4 | Quest + moral fork + save/load + slice polish → **Milestone 1** |
| P5 | Hub polish + poster art |
| P6 | Combat depth + creature roster (Blender signature beast) |
| P7 | Life-sim layer: property, jobs, relationships-lite |
| P8 | World #2: cyberpunk night market |
| P9+ | Adventure island / magical academy / dark-fairytale variant |

Each phase ends with: typecheck + vitest green + real-browser smoke run + commit.

## 11. Testing

- vitest on headless systems: opinion math, gossip propagation, perception
  geometry, quest state machines, save round-trip.
- Manual browser playtest per phase; performance budget checked (60 fps).
- Per global rules: typecheck AND runtime smoke before any "done" claim —
  vitest-green alone is insufficient.

## 12. IP guardrail

No copyrighted names, characters, places, music, maps, storylines, or logos from
any existing game. Systems and tone are inspiration; all content is original.
Checked at every content-authoring phase.
