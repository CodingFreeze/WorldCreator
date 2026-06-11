import { describe, it, expect } from "vitest";
import { FixedStepAccumulator } from "./FixedStepLoop";

describe("FixedStepAccumulator", () => {
  it("emits no steps when accumulated time < step", () => {
    const a = new FixedStepAccumulator(1 / 60);
    expect(a.tick(0.005)).toBe(0);
  });

  it("emits floor(acc/step) steps and keeps remainder", () => {
    const a = new FixedStepAccumulator(1 / 60);
    const steps = a.tick(3.5 / 60);
    expect(steps).toBe(3);
    // remainder 0.5 step -> alpha 0.5
    expect(a.alpha).toBeCloseTo(0.5);
  });

  it("clamps huge frames to maxSteps (spiral-of-death guard)", () => {
    const a = new FixedStepAccumulator(1 / 60, 5);
    const steps = a.tick(2.0); // 120 steps worth
    expect(steps).toBe(5);
    expect(a.alpha).toBeLessThanOrEqual(1);
  });
});
