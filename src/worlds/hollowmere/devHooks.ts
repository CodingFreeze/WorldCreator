import type { CharacterController } from "@engine/character/CharacterController";
import type { QuestLog } from "@engine/quest/QuestLog";
import type { VillageNpcs } from "./npcRuntime";
import type { ChickenFlock } from "./chickens";

export interface DevHookDeps {
  char: CharacterController;
  questLog: QuestLog;
  coins: () => number;
  npcs: VillageNpcs;
  chickens: ChickenFlock;
}

/** E2E/dev hooks — only with ?dev=1. Lets tests teleport and inspect state. */
export function installDevHooks(deps: DevHookDeps): void {
  if (!new URLSearchParams(location.search).has("dev")) return;
  const { char, questLog, coins, npcs, chickens } = deps;
  (window as unknown as Record<string, unknown>).__wc = {
    teleport: (x: number, z: number) => char.setPosition({ x, y: 1.5, z }),
    playerPos: () => char.position,
    questStage: () => questLog.stageOf("remedy"),
    coins,
    npcPositions: () =>
      Object.fromEntries(
        npcs.entities.map((e) => [
          e.def.id,
          { x: e.parts.group.position.x, z: e.parts.group.position.z },
        ]),
      ),
    attitudes: () => Object.fromEntries(npcs.entities.map((e) => [e.def.id, e.mind.attitude])),
    mindStats: () =>
      Object.fromEntries(
        npcs.entities.map((e) => [
          e.def.id,
          { morality: e.mind.morality, memories: e.mind.memories.size },
        ]),
      ),
    chickenPositions: () => chickens.positions(),
    pressKey: (code: string) => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code }));
    },
  };
}
