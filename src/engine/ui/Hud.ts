/** Minimal HUD overlay: interaction prompt + toast messages. */
export class Hud {
  private readonly promptEl: HTMLDivElement;
  private readonly toastEl: HTMLDivElement;
  private toastTimer: number | null = null;

  constructor(container: HTMLElement) {
    container.style.position = "relative";

    this.promptEl = document.createElement("div");
    this.promptEl.style.cssText = [
      "position:absolute",
      "left:50%",
      "bottom:18%",
      "transform:translateX(-50%)",
      "background:rgba(24,18,12,0.75)",
      "border:1px solid #c9a25e",
      "border-radius:6px",
      "padding:6px 12px",
      "color:#f2e8d8",
      "font-family:Georgia, serif",
      "font-size:14px",
      "display:none",
      "z-index:9",
      "pointer-events:none",
    ].join(";");

    this.toastEl = document.createElement("div");
    this.toastEl.style.cssText = [
      "position:absolute",
      "left:50%",
      "top:10%",
      "transform:translateX(-50%)",
      "background:rgba(24,18,12,0.8)",
      "border:1px solid #c9a25e",
      "border-radius:6px",
      "padding:8px 16px",
      "color:#e8c478",
      "font-family:Georgia, serif",
      "font-size:15px",
      "display:none",
      "z-index:9",
      "pointer-events:none",
    ].join(";");

    container.append(this.promptEl, this.toastEl);
  }

  private barsEl: HTMLDivElement | null = null;
  private healthFill: HTMLDivElement | null = null;
  private flowFill: HTMLDivElement | null = null;

  /** Health + flow bars, bottom-left. Call once; update via setBars. */
  enableBars(): void {
    if (this.barsEl) return;
    this.barsEl = document.createElement("div");
    this.barsEl.style.cssText =
      "position:absolute;left:18px;bottom:16px;display:flex;flex-direction:column;gap:6px;z-index:9;pointer-events:none";
    const mkBar = (color: string, w: number) => {
      const outer = document.createElement("div");
      outer.style.cssText = `width:${w}px;height:12px;background:rgba(24,18,12,0.7);border:1px solid #c9a25e;border-radius:6px;overflow:hidden`;
      const fill = document.createElement("div");
      fill.style.cssText = `width:100%;height:100%;background:${color};transition:width 0.15s`;
      outer.appendChild(fill);
      this.barsEl?.appendChild(outer);
      return fill;
    };
    this.healthFill = mkBar("#c4452f", 180);
    this.flowFill = mkBar("#4ac4e8", 120);
    this.promptEl.parentElement?.appendChild(this.barsEl);
  }

  setBars(health01: number, flow01: number): void {
    if (this.healthFill) this.healthFill.style.width = `${Math.max(0, health01) * 100}%`;
    if (this.flowFill) this.flowFill.style.width = `${Math.max(0, flow01) * 100}%`;
  }

  private coinsEl: HTMLDivElement | null = null;

  setCoins(n: number): void {
    if (!this.coinsEl) {
      this.coinsEl = document.createElement("div");
      this.coinsEl.style.cssText =
        "position:absolute;right:18px;top:14px;background:rgba(24,18,12,0.75);border:1px solid #c9a25e;border-radius:6px;padding:6px 12px;color:#e8c478;font-family:Georgia,serif;font-size:15px;z-index:9;pointer-events:none";
      this.promptEl.parentElement?.appendChild(this.coinsEl);
    }
    this.coinsEl.textContent = `Coins: ${n}`;
  }

  setPrompt(text: string | null): void {
    if (text) {
      this.promptEl.textContent = text;
      this.promptEl.style.display = "block";
    } else {
      this.promptEl.style.display = "none";
    }
  }

  toast(text: string, durationMs = 2600): void {
    this.toastEl.textContent = text;
    this.toastEl.style.display = "block";
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.style.display = "none";
    }, durationMs);
  }
}
