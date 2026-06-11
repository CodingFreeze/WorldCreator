import * as THREE from "three";

export interface ChickenParts {
  group: THREE.Group;
  head: THREE.Group;
}

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/** The load-bearing chicken. Origin at ground, faces +z. */
export function createChicken(): ChickenParts {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 9), lambert("#f2ede2"));
  body.position.y = 0.18;
  body.scale.set(1, 0.9, 1.25);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.09, 11, 8), lambert("#f2ede2"));
  skull.castShadow = true;
  head.add(skull);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 8), lambert("#e8a33d"));
  beak.rotation.x = Math.PI / 2;
  beak.position.z = 0.1;
  head.add(beak);

  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.08), lambert("#d4452f"));
  comb.position.y = 0.1;
  head.add(comb);

  head.position.set(0, 0.38, 0.14);
  group.add(head);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 8), lambert("#e0d8c8"));
  tail.rotation.x = -Math.PI / 3;
  tail.position.set(0, 0.26, -0.2);
  group.add(tail);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 4), lambert("#e8a33d"));
    leg.position.set(side * 0.05, 0.06, 0);
    group.add(leg);
  }

  return { group, head };
}

/**
 * Peck/strut animation. pecking in [0,1] dips the head; phase drives a
 * little waddle.
 */
export function animateChicken(parts: ChickenParts, phase: number, pecking: number): void {
  parts.group.rotation.z = Math.sin(phase * 8) * 0.06;
  parts.head.position.y = 0.38 - pecking * 0.22;
  parts.head.position.z = 0.14 + pecking * 0.1;
  parts.head.rotation.x = pecking * 0.9;
}
