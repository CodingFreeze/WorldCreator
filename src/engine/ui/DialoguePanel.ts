export interface DialogueChoice {
  label: string;
  onPick: () => void;
}

/**
 * HTML-overlay dialogue panel: speaker name, line, optional choices.
 * One instance per world; show() replaces content.
 */
export class DialoguePanel {
  private readonly root: HTMLDivElement;
  private readonly nameEl: HTMLDivElement;
  private readonly lineEl: HTMLDivElement;
  private readonly choicesEl: HTMLDivElement;
  visible = false;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.style.cssText = [
      "position:absolute",
      "left:50%",
      "bottom:6%",
      "transform:translateX(-50%)",
      "min-width:340px",
      "max-width:560px",
      "background:rgba(24,18,12,0.88)",
      "border:2px solid #c9a25e",
      "border-radius:10px",
      "padding:14px 18px",
      "color:#f2e8d8",
      "font-family:Georgia, 'Times New Roman', serif",
      "font-size:15px",
      "line-height:1.45",
      "display:none",
      "z-index:10",
      "pointer-events:auto",
    ].join(";");

    this.nameEl = document.createElement("div");
    this.nameEl.style.cssText = "color:#e8c478;font-weight:bold;margin-bottom:6px;font-size:14px;letter-spacing:0.5px";
    this.lineEl = document.createElement("div");
    this.choicesEl = document.createElement("div");
    this.choicesEl.style.cssText = "margin-top:10px;display:flex;flex-direction:column;gap:6px";
    this.root.append(this.nameEl, this.lineEl, this.choicesEl);
    container.appendChild(this.root);
  }

  show(speaker: string, line: string, choices: DialogueChoice[] = []): void {
    this.nameEl.textContent = speaker;
    this.lineEl.textContent = line;
    this.choicesEl.replaceChildren();
    for (const choice of choices) {
      const btn = document.createElement("button");
      btn.textContent = choice.label;
      btn.style.cssText = [
        "background:#3a2d1d",
        "color:#f2e8d8",
        "border:1px solid #c9a25e",
        "border-radius:6px",
        "padding:7px 10px",
        "font-family:inherit",
        "font-size:14px",
        "cursor:pointer",
        "text-align:left",
      ].join(";");
      btn.onmouseenter = () => (btn.style.background = "#52401f");
      btn.onmouseleave = () => (btn.style.background = "#3a2d1d");
      btn.onclick = () => choice.onPick();
      this.choicesEl.appendChild(btn);
    }
    this.root.style.display = "block";
    this.visible = true;
  }

  hide(): void {
    this.root.style.display = "none";
    this.visible = false;
  }
}
