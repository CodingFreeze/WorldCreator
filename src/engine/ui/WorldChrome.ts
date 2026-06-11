import type * as THREE from "three";
import { Settings } from "@engine/core/Settings";
import { SfxBus } from "@engine/audio/SfxBus";
import { SettingsMenu } from "./SettingsMenu";
import type { ThirdPersonCamera } from "@engine/character/ThirdPersonCamera";

export interface WorldChrome {
  settings: Settings;
  sfx: SfxBus;
  menu: SettingsMenu;
  dispose(): void;
}

/**
 * Standard per-world chrome: persisted settings, Esc settings menu, SFX bus —
 * with brightness wired to renderer exposure, volume to the bus, and
 * sensitivity to the camera. Every world installs this once.
 */
export function installWorldChrome(
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
  camera: ThirdPersonCamera,
  baseExposure: number,
): WorldChrome {
  const settings = new Settings();
  const sfx = new SfxBus(settings.current.volume);
  const menu = new SettingsMenu(container, settings);
  const unbindKey = menu.bindKey();
  const unbindSettings = settings.onChange((s) => {
    renderer.toneMappingExposure = baseExposure * s.brightness;
    sfx.setVolume(s.volume);
    camera.sensitivity = s.mouseSens;
  });

  return {
    settings,
    sfx,
    menu,
    dispose: () => {
      unbindKey();
      unbindSettings();
      sfx.dispose();
    },
  };
}
