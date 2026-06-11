export interface ScheduleStop {
  /** Hour of day this stop begins [0,24). */
  hour: number;
  x: number;
  z: number;
  /** Loose activity tag — drives idle animation / dialogue flavor. */
  activity: "home" | "work" | "social" | "wander";
}

/**
 * Where an NPC should be at a given hour: the stop with the largest
 * hour <= current (wrapping to the last stop overnight).
 */
export function currentStop(schedule: readonly ScheduleStop[], hour: number): ScheduleStop {
  if (schedule.length === 0) throw new Error("empty schedule");
  let best: ScheduleStop | null = null;
  for (const stop of schedule) {
    if (stop.hour <= hour && (!best || stop.hour > best.hour)) best = stop;
  }
  // Before the first stop of the day -> still at yesterday's last stop.
  if (!best) {
    best = schedule.reduce((a, b) => (b.hour > a.hour ? b : a));
  }
  return best;
}
