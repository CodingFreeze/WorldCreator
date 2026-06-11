import * as THREE from "three";

export interface HumanoidColors {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
}

export interface HumanoidParts {
  group: THREE.Group;
  head: THREE.Mesh;
  torso: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function limb(
  color: string,
  width: number,
  length: number,
  pivotY: number,
): THREE.Group {
  // Pivot group at the joint; mesh hangs below it so rotation swings naturally.
  const pivot = new THREE.Group();
  pivot.position.y = pivotY;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, width), lambert(color));
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

/**
 * Stylized low-poly humanoid, ~1.7m tall, origin at feet.
 * Chunky proportions (big head, short legs) sell the storybook look and
 * hide the absence of authored models.
 */
export function createHumanoid(colors: HumanoidColors, scale = 1): HumanoidParts {
  const group = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.28), lambert(colors.shirt));
  torso.position.y = 0.95;
  torso.castShadow = true;
  group.add(torso);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.26), lambert(colors.pants));
  hips.position.y = 0.62;
  hips.castShadow = true;
  group.add(hips);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), lambert(colors.skin));
  head.position.y = 1.45;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 9, 0, Math.PI * 2, 0, Math.PI * 0.55),
    lambert(colors.hair),
  );
  hair.position.y = 1.49;
  group.add(hair);

  const leftArm = limb(colors.shirt, 0.13, 0.52, 1.18);
  leftArm.position.x = -0.3;
  const rightArm = limb(colors.shirt, 0.13, 0.52, 1.18);
  rightArm.position.x = 0.3;
  const leftLeg = limb(colors.pants, 0.16, 0.55, 0.55);
  leftLeg.position.x = -0.12;
  const rightLeg = limb(colors.pants, 0.16, 0.55, 0.55);
  rightLeg.position.x = 0.12;
  group.add(leftArm, rightArm, leftLeg, rightLeg);

  group.scale.setScalar(scale);
  return { group, head, torso, leftArm, rightArm, leftLeg, rightLeg };
}

/**
 * Drive a walk/idle pose. phase advances with distance traveled;
 * intensity 0 = idle (limbs settle), 1 = full stride.
 */
export function animateHumanoid(parts: HumanoidParts, phase: number, intensity: number): void {
  const swing = Math.sin(phase) * 0.7 * intensity;
  parts.leftLeg.rotation.x = swing;
  parts.rightLeg.rotation.x = -swing;
  parts.leftArm.rotation.x = -swing * 0.8;
  parts.rightArm.rotation.x = swing * 0.8;
  // Idle breathing bob when standing still.
  const breathe = Math.sin(phase * 0.3) * 0.01 * (1 - intensity);
  parts.torso.position.y = 0.95 + Math.abs(Math.sin(phase)) * 0.03 * intensity + breathe;
}
