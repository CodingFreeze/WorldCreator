import type { CharacterController } from "@engine/character/CharacterController";
import type { DroneMode } from "./drone";
import type { MarketLayout } from "./layout";

export interface MarketDevDeps {
  char: CharacterController;
  layout: MarketLayout;
  credits: () => number;
  hacked: () => number[];
  droneMode: () => DroneMode;
  doorOpen: () => boolean;
  chips: () => { x: number; z: number }[];
  stashPos: () => { x: number; z: number };
}

/** E2E/dev hooks for the market — only with ?dev=1. */
export function installMarketDevHooks(deps: MarketDevDeps): void {
  if (!new URLSearchParams(location.search).has("dev")) return;
  (window as unknown as Record<string, unknown>).__wcMarket = {
    teleport: (x: number, z: number) => deps.char.setPosition({ x, y: 1.5, z }),
    playerPos: () => deps.char.position,
    credits: deps.credits,
    hacked: deps.hacked,
    droneMode: deps.droneMode,
    doorOpen: deps.doorOpen,
    chips: deps.chips,
    stashPos: deps.stashPos,
    terminals: () => deps.layout.terminals,
    pressKey: (code: string) => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code }));
    },
  };
}
