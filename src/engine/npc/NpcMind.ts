import {
  EVENT_IMPACTS,
  TARGET_MULTIPLIER,
  type WorldEvent,
} from "./events";

export interface Memory {
  event: WorldEvent;
  /** 1 = saw it personally; gossip arrives decayed. */
  weight: number;
  secondhand: boolean;
}

export type Attitude = "warm" | "neutral" | "wary" | "hostile";

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * One NPC's view of the player: opinion scalars + remembered events.
 * Updated ONLY via witness() and hearGossip() — consumers read, never write
 * (spec §5).
 */
export class NpcMind {
  morality = 0;
  fear = 0;
  affection = 0;
  readonly memories = new Map<number, Memory>();

  constructor(readonly npcId: string) {}

  /** Apply a personally witnessed event at full weight. */
  witness(event: WorldEvent): void {
    this.apply(event, 1, false);
  }

  /** Apply a secondhand event; ignored if already known. */
  hearGossip(event: WorldEvent, weight: number): boolean {
    if (this.memories.has(event.id)) return false;
    this.apply(event, weight, true);
    return true;
  }

  private apply(event: WorldEvent, weight: number, secondhand: boolean): void {
    if (this.memories.has(event.id)) return;
    const impact = EVENT_IMPACTS[event.type];
    const personal = event.targetId === this.npcId ? TARGET_MULTIPLIER : 1;
    this.morality = clamp(this.morality + impact.morality * weight);
    this.fear = clamp(this.fear + impact.fear * weight * personal);
    this.affection = clamp(this.affection + impact.affection * weight * personal);
    this.memories.set(event.id, { event, weight, secondhand });
  }

  /** Recent memories, newest first — what this NPC would gossip about. */
  recentMemories(limit = 5): Memory[] {
    return [...this.memories.values()]
      .sort((a, b) => b.event.timeHours - a.event.timeHours)
      .slice(0, limit);
  }

  /** Coarse stance — drives greetings, dialogue tone, prices. */
  get attitude(): Attitude {
    const regard = this.morality * 0.5 + this.affection * 0.5;
    if (this.fear > 0.55 || regard < -0.45) return "hostile";
    if (regard < -0.12) return "wary";
    if (regard > 0.18) return "warm";
    return "neutral";
  }

  /** Does this NPC only know of the player by rumor? */
  get knowsOnlyByRumor(): boolean {
    if (this.memories.size === 0) return false;
    return [...this.memories.values()].every((m) => m.secondhand);
  }
}
