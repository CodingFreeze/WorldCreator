import type { HumanoidColors } from "@engine/procgen/humanoid";
import type { ScheduleStop } from "@engine/npc/schedule";
import type { Attitude } from "@engine/npc/NpcMind";
import type { VillageLayout } from "./layout";

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  colors: HumanoidColors;
  schedule: ScheduleStop[];
  /** Greeting lines by attitude — picked round-robin. */
  lines: Record<Attitude, string[]>;
  /** Prefix used when the NPC only knows the player by rumor. */
  rumorLine: string;
}

const cottage = (layout: VillageLayout, i: number) => {
  const c = layout.cottages[i % layout.cottages.length];
  if (!c) throw new Error("no cottages in layout");
  // Stand in front of the door (door faces the green).
  const len = Math.hypot(c.x, c.z);
  return { x: c.x * (1 - 2.6 / len), z: c.z * (1 - 2.6 / len) };
};

/**
 * The six villagers of Hollowmere. Schedules are anchored to the generated
 * layout: homes at cottages, socializing at the well, wandering the green.
 */
export function defineRoster(layout: VillageLayout): NpcDef[] {
  const well = { x: 1.8, z: 1.8 };
  const green = { x: -2.5, z: 3 };

  return [
    {
      id: "marigold",
      name: "Marigold Plum",
      role: "baker",
      colors: { skin: "#e8b890", shirt: "#c45a7a", pants: "#6a4a5a", hair: "#d49a3a" },
      schedule: [
        { hour: 6, ...cottage(layout, 0), activity: "work" },
        { hour: 13, ...well, activity: "social" },
        { hour: 16, ...green, activity: "wander" },
        { hour: 20, ...cottage(layout, 0), activity: "home" },
      ],
      lines: {
        warm: [
          "Fresh buns, still warm! For you, no charge. Well. Half charge.",
          "You're a good egg, you know that? The chickens agree.",
        ],
        neutral: [
          "Morning! Or evening. Honestly the ovens eat my sense of time.",
          "Mind the third cobble by the well. It bites.",
        ],
        wary: [
          "I've only got day-old loaves for the likes of you.",
          "Hmm. I'm watching you. The bread is watching you too.",
        ],
        hostile: [
          "Out of my bakery's shadow, villain!",
          "I knead dough, not trouble. Shoo!",
        ],
      },
      rumorLine: "Word's gone round about you, stranger.",
    },
    {
      id: "wilfred",
      name: "Wilfred Crabapple",
      role: "retired knight",
      colors: { skin: "#d8a880", shirt: "#5a6a7a", pants: "#3a3a4a", hair: "#c8c8c8" },
      schedule: [
        { hour: 8, ...green, activity: "wander" },
        { hour: 12, ...well, activity: "social" },
        { hour: 18, ...cottage(layout, 1), activity: "home" },
      ],
      lines: {
        warm: [
          "You remind me of me, back when my knees worked.",
          "Stand tall. You've earned a nod from old Crabapple.",
        ],
        neutral: [
          "In my day, the monsters were twice the size and half as polite.",
          "That well? Dug it myself. Mostly. I supervised.",
        ],
        wary: ["I've buried better-behaved folk than you.", "Tread carefully. I still own a sword."],
        hostile: [
          "One more wrong move and I'll fetch the sword. The SHARP one.",
          "Begone, scoundrel, before these old bones remember the war.",
        ],
      },
      rumorLine: "Rumors march faster than armies, stranger.",
    },
    {
      id: "tansy",
      name: "Tansy Foxglove",
      role: "herbalist",
      colors: { skin: "#e8c8a0", shirt: "#5a8a5a", pants: "#4a5a3a", hair: "#8a4a2a" },
      schedule: [
        { hour: 7, x: 0, z: -14, activity: "work" }, // gathering near the north woods
        { hour: 14, ...cottage(layout, 2), activity: "work" },
        { hour: 19, ...well, activity: "social" },
        { hour: 22, ...cottage(layout, 2), activity: "home" },
      ],
      lines: {
        warm: [
          "The mushrooms speak well of you. They rarely speak well of anyone.",
          "Here — smell this. No, it won't... probably won't do anything.",
        ],
        neutral: [
          "Foxglove: pretty, useful, mildly poisonous. Like me.",
          "The woods are restless lately. Something scuttles.",
        ],
        wary: ["Some weeds you pull before they spread.", "The herbs whisper. About you. Unkindly."],
        hostile: [
          "I know seven plants that could end you and three that would enjoy it.",
          "Leave, before I brew something regrettable.",
        ],
      },
      rumorLine: "The nettles told me what you did.",
    },
    {
      id: "bram",
      name: "Bram Puddle",
      role: "shopkeeper",
      colors: { skin: "#d8b090", shirt: "#8a6a3a", pants: "#4a3a2a", hair: "#3a2a1a" },
      schedule: [
        { hour: 8, ...cottage(layout, 3), activity: "work" },
        { hour: 17, ...well, activity: "social" },
        { hour: 21, ...cottage(layout, 3), activity: "home" },
      ],
      lines: {
        warm: [
          "For my favorite customer? Everything's nearly affordable!",
          "You bring class to this village. And coin. Mostly the coin.",
        ],
        neutral: [
          "Buy something or browse harder, friend.",
          "Puddle's Emporium: if I don't stock it, you don't need it.",
        ],
        wary: [
          "Prices just went up. For you specifically.",
          "I count my stock twice when you're about.",
        ],
        hostile: ["We're closed. Forever. To you.", "Thieves get the door. There's the door."],
      },
      rumorLine: "A shopkeeper hears everything, stranger.",
    },
    {
      id: "posy",
      name: "Posy Wren",
      role: "child menace",
      colors: { skin: "#f0c8a8", shirt: "#d4a43a", pants: "#5a6a8a", hair: "#5a3a1a" },
      schedule: [
        { hour: 7, ...green, activity: "wander" },
        { hour: 11, ...well, activity: "social" },
        { hour: 15, x: -8, z: 8, activity: "wander" },
        { hour: 19, ...cottage(layout, 4), activity: "home" },
      ],
      lines: {
        warm: [
          "Did you SEE the chicken with the angry face? I named him Sir Pecksalot.",
          "When I grow up I'm going to be you, but taller.",
        ],
        neutral: [
          "I know where the frogs live. It costs one secret to find out.",
          "Wilfred says his sword is sharp but I've seen him butter bread with it.",
        ],
        wary: ["Mum says I shouldn't talk to you.", "I'm telling EVERYONE what you did."],
        hostile: ["BAD PERSON! BAD PERSON BY THE WELL!", "You're worse than bath night!"],
      },
      rumorLine: "I heard ALL about you. Everyone has.",
    },
    {
      id: "aldous",
      name: "Aldous Mole",
      role: "gravedigger",
      colors: { skin: "#c8a888", shirt: "#3a3a3a", pants: "#2a2a2a", hair: "#1a1a1a" },
      schedule: [
        { hour: 6, x: 14, z: -10, activity: "work" }, // the quiet plot east of the woods
        { hour: 15, ...well, activity: "social" },
        { hour: 18, ...cottage(layout, 5), activity: "home" },
      ],
      lines: {
        warm: [
          "You, I'd bury proper. Six feet, headstone, the works. High praise.",
          "Most folk hurry past me. You've got the stomach for graveyard talk.",
        ],
        neutral: [
          "Business is steady. Business is always steady.",
          "Everyone visits me eventually. No rush, mind.",
        ],
        wary: [
          "Keep on as you are and you'll be my customer sooner than you'd like.",
          "I measure folk by eye. Habit. You're a five-foot-niner.",
        ],
        hostile: [
          "I've a hole with your name on it. Freshly dug. Lovely drainage.",
          "The crows talk about you. The crows are rarely wrong.",
        ],
      },
      rumorLine: "The dead keep secrets. The living, never.",
    },
  ];
}
