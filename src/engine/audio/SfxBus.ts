export type SfxKind = "click" | "hit" | "pickup" | "magic" | "success" | "alarm";

interface Blip {
  type: OscillatorType;
  freqStart: number;
  freqEnd: number;
  duration: number;
  gain: number;
}

const BLIPS: Record<SfxKind, Blip> = {
  click: { type: "square", freqStart: 660, freqEnd: 440, duration: 0.06, gain: 0.18 },
  hit: { type: "sawtooth", freqStart: 220, freqEnd: 90, duration: 0.12, gain: 0.3 },
  pickup: { type: "sine", freqStart: 520, freqEnd: 880, duration: 0.14, gain: 0.25 },
  magic: { type: "triangle", freqStart: 300, freqEnd: 900, duration: 0.2, gain: 0.22 },
  success: { type: "sine", freqStart: 440, freqEnd: 660, duration: 0.3, gain: 0.25 },
  alarm: { type: "square", freqStart: 880, freqEnd: 440, duration: 0.4, gain: 0.25 },
};

/**
 * Tiny procedural SFX bus: oscillator blips through a master gain.
 * AudioContext is created lazily on the first play (needs a user gesture).
 */
export class SfxBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume: number;

  constructor(initialVolume = 0.7) {
    this.volume = initialVolume;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  play(kind: SfxKind): void {
    if (this.volume <= 0) return;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      const blip = BLIPS[kind];
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = blip.type;
      osc.frequency.setValueAtTime(blip.freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, blip.freqEnd), now + blip.duration);
      env.gain.setValueAtTime(blip.gain, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + blip.duration);
      osc.connect(env);
      if (this.master) env.connect(this.master);
      osc.start(now);
      osc.stop(now + blip.duration + 0.02);
    } catch {
      // audio unavailable (headless, autoplay policy) — stay silent
    }
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
