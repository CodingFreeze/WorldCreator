import * as THREE from "three";
import type { GameClock } from "@engine/core/GameClock";

/**
 * Dynamic day/night lighting: warm low-angle sun, sky hemisphere, fog.
 * update() repositions/retints from the GameClock — lighting stays in-engine
 * (spec §7): no baked light, ever.
 */
export class GoldenHourRig {
  readonly sun: THREE.DirectionalLight;
  readonly sky: THREE.HemisphereLight;
  private readonly dayFog = new THREE.Color(0xf2d8b0);
  private readonly nightFog = new THREE.Color(0x1c2233);
  private readonly daySun = new THREE.Color(0xffd9a0);
  private readonly nightSun = new THREE.Color(0x4a5a8a);

  constructor(private readonly scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(this.daySun, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -40;
    this.sun.shadow.camera.right = 40;
    this.sun.shadow.camera.top = 40;
    this.sun.shadow.camera.bottom = -40;
    this.sky = new THREE.HemisphereLight(0xbfd4ff, 0x6b5a3e, 0.7);
    scene.add(this.sun, this.sun.target, this.sky);
    scene.fog = new THREE.Fog(this.dayFog.clone(), 30, 160);
    scene.background = this.dayFog.clone();
  }

  /** Call once per frame. */
  update(clock: GameClock, focus: THREE.Vector3): void {
    const t = clock.daylight01; // 0 midnight .. 1 noon
    const sunAngle = ((clock.hour - 6) / 24) * Math.PI * 2; // rises ~6h
    this.sun.position.set(
      focus.x + Math.cos(sunAngle) * 50,
      Math.max(Math.sin(sunAngle) * 50, -10),
      focus.z + 20,
    );
    this.sun.target.position.copy(focus);
    this.sun.intensity = 0.05 + 2.2 * t;
    this.sun.color.lerpColors(this.nightSun, this.daySun, t);
    this.sky.intensity = 0.15 + 0.6 * t;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.lerpColors(this.nightFog, this.dayFog, t);
    (this.scene.background as THREE.Color).copy(fog.color);
  }
}
