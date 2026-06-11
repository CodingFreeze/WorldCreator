import type { NpcMind } from "./NpcMind";

/** Secondhand stories land at this fraction of the teller's weight. */
export const GOSSIP_DECAY = 0.6;
/** Stories older than this stop circulating (in-game hours). */
export const GOSSIP_FRESHNESS_HOURS = 48;
/** How close two NPCs must be to chat. */
export const GOSSIP_RADIUS = 3;

/**
 * Two NPCs swap their freshest memories of the player. Each tells the other
 * what they don't already know; weight decays per retelling, so reputation
 * "precedes" the player but blurs with distance from the source.
 * Returns number of stories exchanged.
 */
export function exchangeGossip(a: NpcMind, b: NpcMind, nowHours: number): number {
  let exchanged = 0;
  for (const [teller, hearer] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const memory of teller.recentMemories()) {
      if (nowHours - memory.event.timeHours > GOSSIP_FRESHNESS_HOURS) continue;
      const passedWeight = memory.weight * GOSSIP_DECAY;
      if (passedWeight < 0.1) continue; // story too diluted to matter
      if (hearer.hearGossip(memory.event, passedWeight)) exchanged++;
    }
  }
  return exchanged;
}
