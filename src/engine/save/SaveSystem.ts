import type { QuestSnapshot } from "@engine/quest/QuestLog";
import type { MindSnapshot } from "@engine/npc/NpcMind";

export interface SaveDataV1 {
  version: 1;
  worldId: string;
  clockHours: number;
  player: { x: number; y: number; z: number; health: number; coins: number };
  quests: QuestSnapshot;
  minds: Record<string, MindSnapshot>;
  flags: Record<string, boolean>;
}

export type SaveData = SaveDataV1;

const KEY_PREFIX = "worldcreator.save.";

/** Versioned JSON snapshots in localStorage. Pure(ish) — storage injectable. */
export class SaveSystem {
  constructor(
    private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage,
  ) {}

  save(data: SaveData): void {
    this.storage.setItem(KEY_PREFIX + data.worldId, JSON.stringify(data));
  }

  /** Returns null when absent, corrupt, or from an unknown version. */
  load(worldId: string): SaveData | null {
    const raw = this.storage.getItem(KEY_PREFIX + worldId);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed as { version?: unknown }).version === 1 &&
        (parsed as { worldId?: unknown }).worldId === worldId
      ) {
        return parsed as SaveDataV1;
      }
      return null;
    } catch {
      return null;
    }
  }

  clear(worldId: string): void {
    this.storage.removeItem(KEY_PREFIX + worldId);
  }
}
