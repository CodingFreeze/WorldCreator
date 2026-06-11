export type Bindings = Record<string, readonly string[]>;

/** Maps physical key/button codes to named actions. Pure logic. */
export class ActionMap<B extends Bindings = Bindings> {
  private readonly codeToActions = new Map<string, string[]>();
  private readonly down = new Set<string>(); // codes currently held
  private readonly pressedEdges = new Set<string>(); // actions pressed since last consume
  private mouseDX = 0;
  private mouseDY = 0;

  constructor(bindings: B) {
    for (const [action, codes] of Object.entries(bindings)) {
      for (const code of codes) {
        const list = this.codeToActions.get(code) ?? [];
        list.push(action);
        this.codeToActions.set(code, list);
      }
    }
  }

  setKey(code: string, isDown: boolean): void {
    const wasDown = this.down.has(code);
    if (isDown) this.down.add(code);
    else this.down.delete(code);
    if (isDown && !wasDown) {
      for (const action of this.codeToActions.get(code) ?? []) {
        this.pressedEdges.add(action);
      }
    }
  }

  isDown(action: keyof B & string): boolean {
    for (const [code, actions] of this.codeToActions) {
      if (actions.includes(action) && this.down.has(code)) return true;
    }
    return false;
  }

  /** True once per press edge, then cleared for that action. */
  consumePressed(action: keyof B & string): boolean {
    const had = this.pressedEdges.has(action);
    this.pressedEdges.delete(action);
    return had;
  }

  addMouseDelta(dx: number, dy: number): void {
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  drainMouseDelta(): { x: number; y: number } {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }
}
