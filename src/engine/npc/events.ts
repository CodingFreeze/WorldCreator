/**
 * WorldEvents: the reputation system's input. Gameplay emits these; the
 * perception system decides who saw them; NpcMinds form opinions.
 * Pure TS — no rendering imports (spec §5).
 */

export type WorldEventType =
  | "theft"
  | "donation"
  | "attacked_villager"
  | "helped_npc"
  | "kicked_chicken"
  | "kept_promise"
  | "broke_promise"
  | "slew_monster";

export interface WorldEvent {
  id: number;
  type: WorldEventType;
  /** M1: only the player is judged. */
  actor: "player";
  /** NPC directly affected, if any. */
  targetId?: string;
  x: number;
  z: number;
  /** GameClock total-hours timestamp. */
  timeHours: number;
}

export interface OpinionDelta {
  morality: number;
  fear: number;
  affection: number;
}

/** How each witnessed event shifts a witness's view of the actor. */
export const EVENT_IMPACTS: Record<WorldEventType, OpinionDelta> = {
  theft: { morality: -0.35, fear: 0.1, affection: -0.2 },
  donation: { morality: 0.3, fear: -0.05, affection: 0.25 },
  attacked_villager: { morality: -0.7, fear: 0.5, affection: -0.5 },
  helped_npc: { morality: 0.35, fear: -0.05, affection: 0.3 },
  kicked_chicken: { morality: -0.15, fear: 0.08, affection: -0.15 },
  kept_promise: { morality: 0.25, fear: 0, affection: 0.2 },
  broke_promise: { morality: -0.25, fear: 0, affection: -0.25 },
  slew_monster: { morality: 0.15, fear: 0.1, affection: 0.15 },
};

/** Being the TARGET multiplies the affection/fear response. */
export const TARGET_MULTIPLIER = 1.8;

export type EventListener = (event: WorldEvent) => void;

/** Central bus. Worlds emit; perception subscribes. */
export class WorldEventBus {
  private listeners: EventListener[] = [];
  private nextId = 1;

  emit(event: Omit<WorldEvent, "id">): WorldEvent {
    const full: WorldEvent = { ...event, id: this.nextId++ };
    for (const l of this.listeners) l(full);
    return full;
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
