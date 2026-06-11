import { describe, it, expect } from "vitest";
import { computeCameraPose, clampPitch } from "./ThirdPersonCamera";

describe("computeCameraPose", () => {
  it("sits behind the target along -yaw at pitch 0", () => {
    const pose = computeCameraPose({ x: 0, y: 0, z: 0 }, 0, 0, 5, 1.5);
    expect(pose.position.x).toBeCloseTo(0);
    expect(pose.position.z).toBeCloseTo(5); // yaw 0 -> camera at +z
    expect(pose.position.y).toBeCloseTo(1.5);
    expect(pose.lookAt.y).toBeCloseTo(1.5);
  });

  it("orbits with yaw", () => {
    const pose = computeCameraPose({ x: 0, y: 0, z: 0 }, Math.PI / 2, 0, 5, 1.5);
    expect(pose.position.x).toBeCloseTo(5);
    expect(pose.position.z).toBeCloseTo(0, 5);
  });

  it("rises with positive pitch", () => {
    const pose = computeCameraPose({ x: 0, y: 0, z: 0 }, 0, 0.5, 5, 1.5);
    expect(pose.position.y).toBeGreaterThan(1.5);
  });
});

describe("clampPitch", () => {
  it("clamps to [-0.2, 1.2] rad", () => {
    expect(clampPitch(2)).toBeCloseTo(1.2);
    expect(clampPitch(-1)).toBeCloseTo(-0.2);
    expect(clampPitch(0.5)).toBeCloseTo(0.5);
  });
});
