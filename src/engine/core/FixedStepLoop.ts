/** Pure accumulator for a fixed-timestep simulation. Testable headless. */
export class FixedStepAccumulator {
  private acc = 0;

  constructor(
    public readonly stepSec: number,
    public readonly maxSteps = 5,
  ) {}

  /** Feed a real frame delta; returns how many fixed steps to run. */
  tick(frameDtSec: number): number {
    this.acc += frameDtSec;
    let steps = Math.floor(this.acc / this.stepSec);
    if (steps > this.maxSteps) {
      steps = this.maxSteps;
      this.acc = this.stepSec; // drop backlog, keep one step of remainder
    }
    this.acc -= steps * this.stepSec;
    return steps;
  }

  /** Interpolation factor [0,1) of partial step remaining. */
  get alpha(): number {
    return this.acc / this.stepSec;
  }
}

export interface LoopCallbacks {
  /** Fixed-rate simulation update. */
  fixedUpdate: (stepSec: number) => void;
  /** Per-frame render with interpolation alpha. */
  render: (alpha: number, frameDtSec: number) => void;
}

/** requestAnimationFrame driver around the accumulator. Browser-only. */
export class FixedStepLoop {
  private readonly accumulator: FixedStepAccumulator;
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly cb: LoopCallbacks,
    stepSec = 1 / 60,
  ) {
    this.accumulator = new FixedStepAccumulator(stepSec);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.25);
      this.lastTime = now;
      const steps = this.accumulator.tick(dt);
      for (let i = 0; i < steps; i++) this.cb.fixedUpdate(this.accumulator.stepSec);
      this.cb.render(this.accumulator.alpha, dt);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
