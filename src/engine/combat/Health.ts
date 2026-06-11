/** Hit points with invulnerability frames. Pure logic. */
export class Health {
  current: number;
  private iframes = 0;

  constructor(
    readonly max: number,
    private readonly iframeDuration = 0.6,
  ) {
    this.current = max;
  }

  /** Returns true if damage applied (not blocked by i-frames / death). */
  damage(amount: number): boolean {
    if (this.dead || this.iframes > 0) return false;
    this.current = Math.max(0, this.current - amount);
    this.iframes = this.iframeDuration;
    return true;
  }

  heal(amount: number): void {
    if (this.dead) return;
    this.current = Math.min(this.max, this.current + amount);
  }

  update(dt: number): void {
    if (this.iframes > 0) this.iframes -= dt;
  }

  revive(): void {
    this.current = this.max;
    this.iframes = 0;
  }

  get dead(): boolean {
    return this.current <= 0;
  }

  get fraction(): number {
    return this.current / this.max;
  }
}
