import { describe, it, expect } from "vitest";
import { islandHeight, ISLAND_RADIUS } from "./island";

describe("islandHeight", () => {
  it("is deterministic", () => {
    expect(islandHeight(10, -5, 7)).toBe(islandHeight(10, -5, 7));
    expect(islandHeight(10, -5, 7)).not.toBe(islandHeight(10, -5, 8));
  });

  it("peaks near the center and drowns past the radius", () => {
    const center = islandHeight(0, 0, 7);
    const edge = islandHeight(ISLAND_RADIUS + 5, 0, 7);
    expect(center).toBeGreaterThan(6);
    expect(edge).toBeLessThan(0); // underwater
  });

  it("has a beach band: low positive heights somewhere mid-radius", () => {
    let foundBeach = false;
    for (let r = 30; r < ISLAND_RADIUS; r += 1) {
      const h = islandHeight(r, 0, 7);
      if (h > 0 && h < 0.8) foundBeach = true;
    }
    expect(foundBeach).toBe(true);
  });
});
