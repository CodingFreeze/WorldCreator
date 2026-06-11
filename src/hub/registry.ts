import type { WorldBoot } from "@engine/core/World";
import { hollowmerePoster, nightMarketPoster, windwardPoster, type PosterPainter } from "./posters";

export interface WorldEntry {
  id: string;
  title: string;
  tagline: string;
  accent: string;
  poster: PosterPainter;
  /** Lazy module load — worlds stay out of the hub bundle. */
  load: (() => Promise<{ boot: WorldBoot }>) | null;
}

export const WORLDS: WorldEntry[] = [
  {
    id: "hollowmere",
    title: "Hollowmere",
    tagline: "A fairytale village that watches what you do. So do the chickens.",
    accent: "#e8a86a",
    poster: hollowmerePoster,
    load: async () => {
      const m = await import("@worlds/hollowmere/main");
      return { boot: m.bootHollowmere };
    },
  },
  {
    id: "nightmarket",
    title: "Neon Night Market",
    tagline: "Rain, noodles, and secrets in the alley behind the holograms.",
    accent: "#ff2a6a",
    poster: nightMarketPoster,
    load: null, // lands in P6
  },
  {
    id: "windward",
    title: "Windward Isle",
    tagline: "A sunny island, three lost relics, and a shrine above the clouds.",
    accent: "#2a8ab8",
    poster: windwardPoster,
    load: null, // lands in P7
  },
];
