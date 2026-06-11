export interface GameClockOptions {
  /** Real seconds for one full in-game day. */
  dayLengthSec: number;
  /** In-game hour [0,24) at start. */
  startHour: number;
}

/** In-game time of day. Pure logic — no rendering imports. */
export class GameClock {
  private readonly dayLengthSec: number;
  /** Total elapsed in-game hours since start of day 0. */
  private totalHours: number;

  constructor(opts: GameClockOptions) {
    this.dayLengthSec = opts.dayLengthSec;
    this.totalHours = opts.startHour;
  }

  /** Advance by real-time seconds. */
  advance(realDtSec: number): void {
    this.totalHours += (realDtSec / this.dayLengthSec) * 24;
  }

  /** Total in-game hours since day 0 — event timestamps, cooldowns. */
  get totalHoursElapsed(): number {
    return this.totalHours;
  }

  /** Hour of day [0,24). */
  get hour(): number {
    return ((this.totalHours % 24) + 24) % 24;
  }

  /** Whole days elapsed. */
  get day(): number {
    return Math.floor(this.totalHours / 24);
  }

  /** 0 at midnight, 1 at noon — cosine curve for light blending. */
  get daylight01(): number {
    return 0.5 - 0.5 * Math.cos((this.hour / 24) * Math.PI * 2);
  }
}
