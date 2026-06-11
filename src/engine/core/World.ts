/** Handle returned by a world's boot — the hub uses it to tear down. */
export interface WorldHandle {
  dispose(): void;
}

/** Every world module exports a boot conforming to this. */
export type WorldBoot = (container: HTMLElement) => Promise<WorldHandle>;
