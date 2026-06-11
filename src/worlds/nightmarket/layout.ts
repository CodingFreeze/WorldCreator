import { Rng } from "@engine/core/Rng";

export interface StallPlacement {
  x: number;
  z: number;
  rotY: number;
  kind: "noodle" | "trinket" | "vending";
  seed: number;
}

export interface SignPlacement {
  x: number;
  y: number;
  z: number;
  rotY: number;
  text: string;
  color: string;
  width: number;
}

export interface MarketLayout {
  seed: number;
  stalls: StallPlacement[];
  signs: SignPlacement[];
  creditSpawns: { x: number; z: number }[];
  terminals: { x: number; z: number; rotY: number }[];
  /** Patrol waypoints for the security drone. */
  patrol: { x: number; z: number }[];
  backroom: { x: number; z: number; rotY: number };
}

const SIGN_TEXTS: { text: string; color: string }[] = [
  { text: "LUCKY NOODLE", color: "#ff2a6a" },
  { text: "DR. VOLT", color: "#2ad8ff" },
  { text: "MOTH & MOON", color: "#aa2aff" },
  { text: "ZERO-G PAWN", color: "#3aff8a" },
  { text: "SYNTH RAMEN", color: "#ffaa2a" },
  { text: "GHOST TEA", color: "#ff5a2a" },
  { text: "NIGHT OWL VR", color: "#2affd8" },
  { text: "PIXEL PALACE", color: "#ff2ad8" },
];

/**
 * Street-canyon market: building rows at x = ±10 along z in [-40, 40],
 * stalls hugging the walls, neon signs on the facades, credits scattered
 * down the street, three hack terminals, one drone patrol loop.
 * Pure data from seed — deterministic and testable.
 */
export function generateMarketLayout(seed: number): MarketLayout {
  const rng = new Rng(seed);

  const stalls: StallPlacement[] = [];
  const kinds: StallPlacement["kind"][] = ["noodle", "trinket", "vending", "trinket", "noodle", "vending"];
  for (let i = 0; i < 6; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    stalls.push({
      x: side * rng.range(5.4, 6.4),
      z: -30 + i * 12 + rng.range(-2, 2),
      rotY: side > 0 ? -Math.PI / 2 : Math.PI / 2,
      kind: kinds[i] ?? "trinket",
      seed: rng.int(0, 1e9),
    });
  }

  const signs: SignPlacement[] = [];
  const signRng = rng.fork(2);
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const pick = SIGN_TEXTS[i % SIGN_TEXTS.length];
    if (!pick) continue;
    signs.push({
      x: side * 8.8, // facade inner face sits at ±9 — signs hang just proud of it
      y: signRng.range(3, 7),
      z: -35 + i * 10 + signRng.range(-3, 3),
      rotY: side > 0 ? -Math.PI / 2 : Math.PI / 2,
      text: pick.text,
      color: pick.color,
      width: signRng.range(3, 4.5),
    });
  }

  const creditRng = rng.fork(3);
  const creditSpawns = Array.from({ length: 12 }, () => ({
    x: creditRng.range(-5, 5),
    z: creditRng.range(-38, 38),
  }));

  const terminals = [
    { x: -8.8, z: -20, rotY: Math.PI / 2 },
    { x: 8.8, z: 2, rotY: -Math.PI / 2 },
    { x: -8.8, z: 26, rotY: Math.PI / 2 },
  ];

  const patrol = [
    { x: 0, z: -32 },
    { x: 3.5, z: -10 },
    { x: -3.5, z: 12 },
    { x: 0, z: 34 },
    { x: -3.5, z: 10 },
    { x: 3.5, z: -12 },
  ];

  return {
    seed,
    stalls,
    signs,
    creditSpawns,
    terminals,
    patrol,
    backroom: { x: 9.2, z: 36, rotY: -Math.PI / 2 },
  };
}
