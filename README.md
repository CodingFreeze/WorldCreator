# WorldCreator

A browser-based collection of small, fully procedural 3D worlds built on one
shared Three.js + TypeScript engine. No external assets — every mesh, texture,
and poster is generated in code.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Other commands: `pnpm test` (vitest, 78 tests), `pnpm typecheck`, `pnpm build`.

## The worlds

| World | What it is |
|---|---|
| **Hollowmere** | Whimsical fairytale action-RPG village. Six villagers form opinions **only from what they personally see** — and what they hear: witnessed deeds spread NPC-to-NPC as gossip with decaying weight. One quest with a real moral fork (keep your promise to the herbalist, or sell her glowmoss behind her back — she'll hear about it). Melee/bow/magic combat with a style-weaving flow bonus, two enemy species in the north woods, kickable chickens (witnessed, remembered), day/night cycle, save/load. |
| **Neon Night Market** | Rainy cyberpunk street canyon. Neon canvas-texture signage, noodle-stall steam, credit chips, three hackable terminals watched by a patrol drone (hack in its vision cone and it fines you), and a backroom that unlocks when all three fall. |
| **Windward Isle** | Sunny exploration island with trimesh-collider terrain, an animated ocean, leaning palms, ruins, two treasure chests, three lost relics, and a hilltop shrine that wakes when you return them. |

## Controls

WASD move · mouse look (click canvas for pointer lock) · Space jump ·
E interact/talk · left-click melee · right-click bow · Q magic bolt ·
F mischief (Hollowmere) · K save (Hollowmere)

## Architecture

```
src/
  engine/      # world-agnostic: never imports from worlds/
    core/      # fixed-step loop, game clock, seeded RNG, world interface
    render/    # ACES renderer, golden-hour day/night rig, particle bursts
    input/     # action mapping (pure) + DOM adapter
    physics/   # Rapier wrapper: colliders, character primitives, LOS rays
    character/ # kinematic controller + third-person camera (pure pose math)
    npc/       # the reputation spine: events, minds, perception, gossip
    combat/    # health/i-frames, weaving state machine, enemy FSM, projectiles
    procgen/   # canvas textures, cottages, trees, chickens, humanoids
    quest/ save/ ui/
  hub/         # world-select SPA: procedural poster cards, lazy import()
  worlds/      # content only — each world consumes the engine API
    hollowmere/ nightmarket/ windward/
```

The reputation system (`engine/npc/`) is the architectural centerpiece: pure
TypeScript with zero Three.js imports. Gameplay emits `WorldEvent`s; a
perception pass computes witnesses (range + facing + physics line-of-sight);
each NPC's `NpcMind` updates only from what it witnessed or heard; gossip
exchanges memories at 0.6× weight per retelling until stories dilute away.
Dialogue, greetings, and quest reactions are read-only consumers.

Worlds are lazy-loaded modules returning a `WorldHandle` for disposal — the
hub swaps them in and out of one page.

## Engineering notes

- Deterministic generation: every world builds from a seed (`Rng`, mulberry32);
  no ambient randomness in generation code.
- Headless-tested systems: clock, loop accumulator, input map, physics,
  character controller (walks, jumps, wall-blocked — real Rapier in vitest),
  camera math, opinions, perception, gossip decay, schedules, combat state
  machines, drone FSM, island heightfield, save round-trips.
- Files stay under 300 lines; engine never imports world code.
- E2E verified via dev hooks (`?dev=1` exposes `__wc*` test handles): full
  quest playthrough, witnessed-vs-unseen mischief, gossip spread with exact
  decay values, save/reload, market hack loop, island relic-shrine loop.
