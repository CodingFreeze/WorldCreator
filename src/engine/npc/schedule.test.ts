import { describe, it, expect } from "vitest";
import { currentStop, type ScheduleStop } from "./schedule";

const schedule: ScheduleStop[] = [
  { hour: 7, x: 0, z: 0, activity: "work" },
  { hour: 12, x: 5, z: 5, activity: "social" },
  { hour: 20, x: 10, z: 10, activity: "home" },
];

describe("currentStop", () => {
  it("picks the active stop for mid-day", () => {
    expect(currentStop(schedule, 13).activity).toBe("social");
  });
  it("picks the first stop right at its hour", () => {
    expect(currentStop(schedule, 7).activity).toBe("work");
  });
  it("wraps overnight to the last stop", () => {
    expect(currentStop(schedule, 3).activity).toBe("home");
  });
});
