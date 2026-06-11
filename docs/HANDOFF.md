# WorldCreator — Handoff / Pick-Up-Later Doc

Last updated: 2026-06-11. State as of commit `64f96bb`.

## Where the project stands

Shipped and verified:

- **Shared engine** (`src/engine/`): fixed-step loop, game clock, seeded RNG,
  ACES renderer + golden-hour day/night rig, action-mapped input, Rapier
  physics (cuboid/cylinder/capsule/trimesh, LOS rays), kinematic character
  controller + third-person camera, reputation core (events → perception →
  NpcMind → gossip), combat (health/i-frames, weaving state machine, enemy
  FSM, projectiles, particle bursts), quest log, versioned save system,
  HUD/dialogue/settings UI, procedural SFX bus, procgen toolkit (canvas
  textures, cottages, trees, chickens, humanoids).
- **Hub** (`src/hub/`): poster-card select screen (canvas-painted posters),
  lazy `import()` per world, dispose/return flow.
- **World 1 — Hollowmere** (full vertical slice): village + north woods,
  6 scheduled NPCs with witnessed-actions opinions + gossip decay (0.6× per
  retelling), Crabapple Remedy quest with moral fork (hand over vs sell to
  Bram — Tansy learns via gossip), 3-style combat vs thornlings/emberwisps,
  chicken mischief (witnessed), day/night with glowing windows, save/load
  (autosave 30s + K + on-exit).
- **World 2 — Neon Night Market**: neon street canyon, rain/steam, credit
  chips, 3 hack terminals, patrol drone (suspicion → alarm → fine), backroom
  stash. **World 3 — Windward Isle**: trimesh island, animated ocean, palms/
  ruins, 2 chests, 3 relics → shrine activation.
- **Settings menu** (Esc): brightness/volume/sensitivity sliders + controls
  reference; pauses the world; persists. **Dialogue UX**: choices release
  pointer lock, numbered, Digit1–4 answer.

Quality state: 82 vitest tests, `pnpm typecheck` + `pnpm build` clean, all
files <300 lines, 60.5 fps measured in all three worlds after the polygon
density pass, zero console errors.

## How to run and verify

```bash
pnpm install && pnpm dev    # http://localhost:5173
pnpm test && pnpm typecheck && pnpm build
```

- `?world=hollowmere` boots a world directly; `?fresh=1` ignores the save;
  `?dev=1` installs E2E hooks: `window.__wc` (Hollowmere), `__wcMarket`,
  `__wcIsle` — each exposes `teleport(x,z)`, state getters, `pressKey(code)`.
- Browser verification: use **chrome-devtools MCP** (real Chrome). The gstack
  browse headless browser has NO WebGL and its headed daemon drops state
  between calls — don't use it for this project.
- E2E pattern that works: `evaluate_script` + dev hooks (teleport → pressKey
  → assert state getters / DOM). Full quest, gossip-decay, and save round-trip
  scripts are in the session history; they take ~10 lines each.

## Key documents

- `docs/specs/2026-06-10-worldcreator-design.md` — approved design spec
  (architecture, reputation system contract, phase plan).
- `docs/plans/2026-06-10-p0-engine-core.md` — P0 implementation plan (done).
- `docs/WORLDS.md` — world roster with status + 2 unbuilt candidates.
- `README.md` — overview, controls, architecture map.

## What's left / next steps (in rough priority order)

### Content (spec roadmap, not yet built)
1. **World 4 — The Greywick Academy** (roster #4): magical school courtyard,
   floating candles/books, spell-casting, hidden-room quest. All needed
   engine pieces exist.
2. **World 5 — Hollowmere After Dark** (roster #5): night/dark-fairytale
   variant reusing Hollowmere content with a different rig/palette/NPC set —
   cheapest world to ship; proves engine theming.
3. **Hollowmere P6 (spec §10)**: combat depth — per-style upgrades, signature
   creature (original fire-breathing cockatrice-type was planned), more enemy
   variety, boss-ish encounter in the woods.
4. **Hollowmere P7 (spec §10)**: life-sim layer — property purchase, jobs
   (blacksmith/baker minigames), relationships/romance-lite, family. The
   opinion system already supports affection; consumers just don't exist yet.
5. **More quests**: only one exists. The quest engine (QuestLog + per-NPC
   dialogue routing in `quest.ts`) generalizes; add a second quest file and
   route more NPC ids in `questDialogueFor`.

### Systems / engineering debt
6. **Theft mechanic**: spec lists `theft` WorldEvents; emitter never wired
   (no shops with takeable goods). Bram's stall is the natural place.
7. **Gossip distortion**: spec said secondhand stories get "slight
   distortion"; implemented decay only. Could mutate event type/weight rarely.
8. **Save in worlds 2/3**: SaveSystem is engine-level but only Hollowmere
   persists. Market credits/hacks and Isle relics/pearls reset every visit.
9. **Audio depth**: SfxBus is oscillator blips. Ambient beds (wind, rain,
   tavern murmur) + footsteps would transform feel. Volume already plumbed.
10. **Animation polish**: humanoids have walk/idle/strike only — no jump pose,
    no death anim (enemies just vanish + burst), chicken flap missing.
11. **Postprocessing**: no bloom — neon market would benefit most (currently
    faked with toneMapped=false materials).
12. **Mobile/touch**: none. Pointer lock + WASD only.
13. **Deploy**: `pnpm build` works; no host configured. Static deploy
    (Vercel/Pages) is one command, but decide on a public name + check the
    rapier WASM chunk size warning (code-splitting config in vite if desired).

### Known wrinkles (small, documented, non-blocking)
- Esc in pointer lock: browser consumes the first press to release the
  cursor, so settings open on the second press (noted in the menu UI).
- Rapier 0.19 logs a harmless init deprecation warning (typed API lags).
- Favicon 404 in console (no favicon).
- The market drone only punishes hacking it can see; wandering in its
  spotlight is otherwise consequence-free (by design, but easy to extend).
- NPC schedules use straight-line walking — no pathfinding; cottage ring is
  open enough that they rarely clip buildings, but a navmesh would fix the
  occasional shoulder-scrape.

## Architecture rules to preserve

- `engine/` never imports from `worlds/` or `hub/`. Worlds consume engine.
- Reputation/gameplay logic stays headless (no Three.js imports) and tested.
- All generation is seed-deterministic (`Rng`, no ambient randomness).
- Every functional file under 300 lines — split before breaching.
- Every phase ends: typecheck + tests + build + real-browser smoke at 60fps.
