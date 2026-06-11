import type { QuestLog } from "@engine/quest/QuestLog";
import type { WorldEventBus } from "@engine/npc/events";
import type { DialogueChoice } from "@engine/ui/DialoguePanel";
import type { Vec3 } from "@engine/physics/PhysicsWorld";

export const QUEST_ID = "remedy";
export const MOSS_POSITION = { x: 6, z: -40 };

export interface QuestDialogue {
  line: string;
  choices: DialogueChoice[];
}

export interface QuestServices {
  log: QuestLog;
  bus: WorldEventBus;
  nowHours: () => number;
  playerPos: () => Vec3;
  addCoins: (n: number) => void;
  toast: (msg: string) => void;
  closeDialogue: () => void;
}

/**
 * "The Crabapple Remedy" — Tansy needs glowmoss from the north woods for
 * Wilfred's knees. Hand it to her (promise kept, modest reward) or sell it
 * to Bram (better coin, broken promise that reaches Tansy by gossip).
 * Stage graph: offer -> fetch -> carry -> done_good | done_greedy.
 */
export function questDialogueFor(npcId: string, s: QuestServices): QuestDialogue | null {
  const stage = s.log.stageOf(QUEST_ID);

  if (npcId === "tansy") {
    if (stage === null) {
      return {
        line:
          "Old Wilfred's knees are singing again — badly. There's glowmoss at the north edge of the woods that would quiet them, but the woods have grown... bitey. Fetch me a handful?",
        choices: [
          {
            label: "I'll fetch your glowmoss. (Accept)",
            onPick: () => {
              s.log.start(QUEST_ID, "fetch");
              s.toast("Quest started: The Crabapple Remedy — find glowmoss in the north woods.");
              s.closeDialogue();
            },
          },
          {
            label: "Knees heal. Eventually. (Decline)",
            onPick: () => s.closeDialogue(),
          },
        ],
      };
    }
    if (stage === "fetch") {
      return {
        line: "The moss glows green, north past the tree line. Mind the thornlings — they bite shins out of principle.",
        choices: [],
      };
    }
    if (stage === "carry") {
      return {
        line: "You found it! Hand it here and I'll have Wilfred dancing by supper. Or hobbling enthusiastically.",
        choices: [
          {
            label: "Hand over the glowmoss. (Keep your promise)",
            onPick: () => {
              s.log.setStage(QUEST_ID, "done_good");
              const p = s.playerPos();
              s.bus.emit({ type: "kept_promise", actor: "player", x: p.x, z: p.z, targetId: "tansy", timeHours: s.nowHours() });
              s.bus.emit({ type: "helped_npc", actor: "player", x: p.x, z: p.z, targetId: "wilfred", timeHours: s.nowHours() });
              s.addCoins(10);
              s.toast("Tansy beams. +10 coins. Wilfred's knees are saved.");
              s.closeDialogue();
            },
          },
          { label: "Not just yet.", onPick: () => s.closeDialogue() },
        ],
      };
    }
    if (stage === "done_good") {
      return { line: "Wilfred says his knees feel twenty years younger. His hips filed a complaint about the favoritism.", choices: [] };
    }
    if (stage === "done_greedy") {
      return {
        line: "Posy told me. You SOLD my glowmoss to Bram? Wilfred limps, and you jingle. The nettles will hear of this.",
        choices: [],
      };
    }
  }

  if (npcId === "bram" && stage === "carry") {
    return {
      line: "Psst. That glowmoss in your pocket? Collectors pay silly money. I'll give you 25 coins, no questions, no herbalists.",
      choices: [
        {
          label: "Sell the glowmoss. (25 coins — break your promise)",
          onPick: () => {
            s.log.setStage(QUEST_ID, "done_greedy");
            const p = s.playerPos();
            s.bus.emit({ type: "broke_promise", actor: "player", x: p.x, z: p.z, targetId: "tansy", timeHours: s.nowHours() });
            s.addCoins(25);
            s.toast("+25 coins. Somewhere, a kneecap creaks accusingly.");
            s.closeDialogue();
          },
        },
        { label: "It's spoken for.", onPick: () => s.closeDialogue() },
      ],
    };
  }

  if (npcId === "wilfred" && stage === "done_good") {
    return {
      line: "These knees! I could storm a castle. A small castle. A bouncy one. You're alright, friend.",
      choices: [],
    };
  }

  return null;
}

/** E-interaction with the moss node during the fetch stage. */
export function tryCollectMoss(s: QuestServices, playerPos: Vec3): boolean {
  if (!s.log.isAt(QUEST_ID, "fetch")) return false;
  if (Math.hypot(playerPos.x - MOSS_POSITION.x, playerPos.z - MOSS_POSITION.z) > 2.2) return false;
  s.log.setStage(QUEST_ID, "carry");
  s.toast("Glowmoss collected. It hums faintly. Probably fine.");
  return true;
}
