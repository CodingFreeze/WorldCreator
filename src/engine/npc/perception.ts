import type { WorldEvent } from "./events";

export interface Observer {
  id: string;
  x: number;
  z: number;
  /** Heading in radians (atan2(dx, dz) convention). */
  facing: number;
}

/** World-supplied occlusion test (physics raycast). */
export type LineOfSightFn = (
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
) => boolean;

export const WITNESS_RADIUS = 14;
/** Wide peripheral vision: ~220 degrees. */
const FACING_DOT_MIN = -0.45;

/**
 * Who personally saw an event: within radius, roughly facing it, and with
 * clear line of sight. Pure logic — occlusion is injected (spec §5).
 */
export function computeWitnesses(
  event: WorldEvent,
  observers: readonly Observer[],
  hasLineOfSight: LineOfSightFn,
  radius = WITNESS_RADIUS,
): string[] {
  const witnesses: string[] = [];
  for (const o of observers) {
    const dx = event.x - o.x;
    const dz = event.z - o.z;
    const dist = Math.hypot(dx, dz);
    if (dist > radius) continue;
    if (dist > 0.5) {
      const fx = Math.sin(o.facing);
      const fz = Math.cos(o.facing);
      const dot = (fx * dx + fz * dz) / dist;
      if (dot < FACING_DOT_MIN) continue; // fully behind them
    }
    if (!hasLineOfSight(o.x, o.z, event.x, event.z)) continue;
    witnesses.push(o.id);
  }
  return witnesses;
}
