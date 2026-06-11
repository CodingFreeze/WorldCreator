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
