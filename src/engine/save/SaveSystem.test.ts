import { describe, it, expect } from "vitest";
import { SaveSystem, type SaveData } from "./SaveSystem";
import { QuestLog } from "@engine/quest/QuestLog";
import { NpcMind } from "@engine/npc/NpcMind";

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

const sample = (): SaveData => {
  const quests = new QuestLog();
  quests.start("remedy", "fetch");
  const mind = new NpcMind("tansy");
  mind.witness({ id: 1, type: "donation", actor: "player", x: 0, z: 0, timeHours: 5 });
  return {
    version: 1,
    worldId: "hollowmere",
    clockHours: 34.5,
    player: { x: 1, y: 2, z: 3, health: 7, coins: 12 },
    quests: quests.serialize(),
    minds: { tansy: mind.serialize() },
    flags: { metTansy: true },
  };
};

describe("SaveSystem", () => {
  it("round-trips a full snapshot", () => {
    const sys = new SaveSystem(new FakeStorage());
    const data = sample();
    sys.save(data);
    const loaded = sys.load("hollowmere");
    expect(loaded).toEqual(data);
  });

  it("mind state survives the round trip functionally", () => {
    const sys = new SaveSystem(new FakeStorage());
    sys.save(sample());
    const loaded = sys.load("hollowmere");
    const mind = new NpcMind("tansy");
    mind.restore(loaded!.minds["tansy"]!);
    expect(mind.attitude).toBe("warm");
    expect(mind.memories.size).toBe(1);
    // Restored memory dedupe still works.
    mind.witness({ id: 1, type: "donation", actor: "player", x: 0, z: 0, timeHours: 5 });
    expect(mind.memories.size).toBe(1);
  });

  it("quest log restores stages", () => {
    const log = new QuestLog();
    log.restore({ remedy: { stage: "carry" } });
    expect(log.isAt("remedy", "carry")).toBe(true);
    log.setStage("remedy", "done_good");
    expect(log.stageOf("remedy")).toBe("done_good");
  });

  it("returns null for missing, corrupt, or wrong-world saves", () => {
    const storage = new FakeStorage();
    const sys = new SaveSystem(storage);
    expect(sys.load("hollowmere")).toBeNull();
    storage.setItem("worldcreator.save.hollowmere", "{not json");
    expect(sys.load("hollowmere")).toBeNull();
    storage.setItem("worldcreator.save.hollowmere", JSON.stringify({ version: 99 }));
    expect(sys.load("hollowmere")).toBeNull();
  });

  it("clear removes the slot", () => {
    const sys = new SaveSystem(new FakeStorage());
    sys.save(sample());
    sys.clear("hollowmere");
    expect(sys.load("hollowmere")).toBeNull();
  });
});
