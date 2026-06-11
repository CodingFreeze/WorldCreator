import { describe, it, expect } from "vitest";
import { GameClock } from "./GameClock";

describe("GameClock", () => {
  it("starts at the given hour", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 9 });
    expect(c.hour).toBeCloseTo(9);
  });

  it("advances proportionally: full dayLength = 24h wrap", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 9 });
    c.advance(600); // one full in-game day
    expect(c.hour).toBeCloseTo(9);
    expect(c.day).toBe(1);
  });

  it("half a day advances 12 hours", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 6 });
    c.advance(300);
    expect(c.hour).toBeCloseTo(18);
  });

  it("daylight01 is 0 at midnight, 1 at noon", () => {
    const c = new GameClock({ dayLengthSec: 600, startHour: 0 });
    expect(c.daylight01).toBeCloseTo(0);
    c.advance(300); // -> 12:00
    expect(c.daylight01).toBeCloseTo(1);
  });
});
