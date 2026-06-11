import { describe, it, expect } from "vitest";
import { EnemyBrain, THORNLING_TUNING, EMBERWISP_TUNING } from "./EnemyBrain";

const step = (brain: EnemyBrain, dist: number, times: number, dt = 0.1) => {
  let attacked = false;
  for (let i = 0; i < times; i++) {
    if (brain.update(dt, dist, true).attack) attacked = true;
  }
  return attacked;
};

describe("EnemyBrain (thornling, melee)", () => {
  it("idles until the player enters aggro range", () => {
    const b = new EnemyBrain(THORNLING_TUNING);
    b.update(0.1, 20, true);
    expect(b.state).toBe("idle");
    b.update(0.1, 10, true);
    expect(b.state).toBe("chase");
  });

  it("chases toward the player, then attacks in range after windup", () => {
    const b = new EnemyBrain(THORNLING_TUNING);
    b.update(0.1, 10, true);
    expect(b.update(0.1, 5, true).moveToward).toBe(1);
    b.update(0.1, 1.0, true); // enters windup
    expect(b.state).toBe("windup");
    const attacked = step(b, 1.0, 6); // 0.6s > windup 0.45
    expect(attacked).toBe(true);
    expect(b.state).toBe("recover");
  });

  it("gives up the chase when the player escapes far enough", () => {
    const b = new EnemyBrain(THORNLING_TUNING);
    b.update(0.1, 5, true);
    expect(b.state).toBe("chase");
    b.update(0.1, 30, true);
    expect(b.state).toBe("idle");
  });

  it("death overrides everything", () => {
    const b = new EnemyBrain(THORNLING_TUNING);
    b.update(0.1, 1, true);
    b.update(0.1, 1, false);
    expect(b.state).toBe("dead");
    expect(b.update(0.1, 1, false).attack).toBe(false);
  });
});

describe("EnemyBrain (emberwisp, ranged)", () => {
  it("retreats when the player closes inside min range", () => {
    const b = new EnemyBrain(EMBERWISP_TUNING);
    b.update(0.1, 12, true); // aggro
    const out = b.update(0.1, 3, true); // too close
    expect(out.moveToward).toBe(-1);
  });

  it("attacks from standoff distance", () => {
    const b = new EnemyBrain(EMBERWISP_TUNING);
    b.update(0.1, 12, true);
    b.update(0.1, 8, true); // inside attack band [5, 9]
    expect(b.state).toBe("windup");
    expect(step(b, 8, 10)).toBe(true);
  });
});
