import { describe, it, expect } from "vitest";
import { generateVillageLayout, distToSegment } from "./layout";

describe("generateVillageLayout", () => {
  it("is deterministic for the same seed", () => {
    const a = generateVillageLayout(42);
    const b = generateVillageLayout(42);
    expect(a).toEqual(b);
  });

  it("different seeds produce different villages", () => {
    const a = generateVillageLayout(1);
    const b = generateVillageLayout(2);
    expect(a.cottages).not.toEqual(b.cottages);
  });

  it("places the requested number of cottages with min spacing", () => {
    const layout = generateVillageLayout(7, 10);
    expect(layout.cottages.length).toBe(10);
    for (let i = 0; i < layout.cottages.length; i++) {
      for (let j = i + 1; j < layout.cottages.length; j++) {
        const a = layout.cottages[i]!;
        const b = layout.cottages[j]!;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(7.5);
      }
    }
  });

  it("cottage doors face the green (rotY points local +z at origin)", () => {
    const layout = generateVillageLayout(7, 6);
    for (const c of layout.cottages) {
      // Direction the door faces after yaw rotation:
      const fx = Math.sin(c.rotY);
      const fz = Math.cos(c.rotY);
      // Should roughly oppose the cottage's position vector (point inward).
      const dot = fx * c.x + fz * c.z;
      expect(dot).toBeLessThan(0);
    }
  });

  it("paths serve every other cottage (avoids mud-plaza merge)", () => {
    const layout = generateVillageLayout(9, 8);
    expect(layout.paths.length).toBe(4);
  });
});

describe("distToSegment", () => {
  it("computes perpendicular distance inside the segment", () => {
    expect(distToSegment(0, 1, -1, 0, 1, 0)).toBeCloseTo(1);
  });
  it("clamps to endpoints outside the segment", () => {
    expect(distToSegment(3, 0, -1, 0, 1, 0)).toBeCloseTo(2);
  });
});
