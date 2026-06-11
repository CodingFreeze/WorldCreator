import type { Settings, SettingsData } from "@engine/core/Settings";

const FONT = "Georgia, 'Times New Roman', serif";

const CONTROLS: [string, string][] = [
  ["W A S D", "move"],
  ["Mouse", "look (click the world to capture the cursor)"],
  ["Space", "jump"],
  ["E", "talk / interact / collect"],
  ["Left click", "melee attack"],
  ["Right click", "bow shot"],
  ["Q", "magic bolt"],
  ["F", "mischief (Hollowmere)"],
  ["K", "save (Hollowmere)"],
  ["1 2 3", "answer dialogue choices"],
  ["Esc", "settings (press twice while the cursor is captured)"],
];

/**
 * Esc-toggled settings overlay: brightness, SFX volume, mouse sensitivity,
 * plus a controls reference tab. Values persist via Settings.
 */
export class SettingsMenu {
  private readonly root: HTMLDivElement;
  visible = false;

  constructor(
    container: HTMLElement,
    private readonly settings: Settings,
  ) {
    this.root = document.createElement("div");
    this.root.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "background:rgba(10,8,5,0.65)",
      "z-index:30",
      `font-family:${FONT}`,
    ].join(";");

    const panel = document.createElement("div");
    panel.style.cssText =
      "background:#1d1812;border:2px solid #c9a25e;border-radius:12px;padding:22px 26px;min-width:380px;color:#f2e8d8";

    const title = document.createElement("div");
    title.textContent = "Settings";
    title.style.cssText = "color:#e8c478;font-size:22px;letter-spacing:2px;margin-bottom:14px";
    panel.appendChild(title);

    panel.appendChild(this.slider("Brightness", "brightness", 0.5, 1.6, 0.05));
    panel.appendChild(this.slider("Audio volume", "volume", 0, 1, 0.05));
    panel.appendChild(this.slider("Mouse sensitivity", "mouseSens", 0.3, 2.5, 0.1));

    const controlsTitle = document.createElement("div");
    controlsTitle.textContent = "Controls";
    controlsTitle.style.cssText =
      "color:#e8c478;font-size:17px;letter-spacing:1px;margin:18px 0 8px";
    panel.appendChild(controlsTitle);

    const table = document.createElement("div");
    table.style.cssText = "display:grid;grid-template-columns:110px 1fr;gap:4px 14px;font-size:13.5px";
    for (const [key, what] of CONTROLS) {
      const k = document.createElement("div");
      k.textContent = key;
      k.style.cssText = "color:#e8c478";
      const v = document.createElement("div");
      v.textContent = what;
      v.style.cssText = "color:#bfae90";
      table.append(k, v);
    }
    panel.appendChild(table);

    const resume = document.createElement("button");
    resume.textContent = "Resume";
    resume.style.cssText =
      "margin-top:18px;width:100%;background:#3a2d1d;color:#f2e8d8;border:1px solid #c9a25e;border-radius:6px;padding:9px;font-family:inherit;font-size:15px;cursor:pointer";
    resume.onmouseenter = () => (resume.style.background = "#52401f");
    resume.onmouseleave = () => (resume.style.background = "#3a2d1d");
    resume.onclick = () => this.hide();
    panel.appendChild(resume);

    this.root.appendChild(panel);
    container.appendChild(this.root);
  }

  private slider(label: string, key: keyof SettingsData, min: number, max: number, step: number): HTMLElement {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:12px;margin:8px 0";
    const name = document.createElement("div");
    name.textContent = label;
    name.style.cssText = "width:140px;font-size:14px;color:#bfae90";
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.settings.current[key]);
    input.style.cssText = "flex:1;accent-color:#c9a25e";
    const value = document.createElement("div");
    value.style.cssText = "width:36px;text-align:right;font-size:13px;color:#e8c478";
    const fmt = (v: number) => (key === "volume" ? `${Math.round(v * 100)}` : v.toFixed(2));
    value.textContent = fmt(this.settings.current[key]);
    input.oninput = () => {
      const v = Number(input.value);
      this.settings.set(key, v);
      value.textContent = fmt(v);
    };
    row.append(name, input, value);
    return row;
  }

  show(): void {
    document.exitPointerLock();
    this.root.style.display = "flex";
    this.visible = true;
  }

  hide(): void {
    this.root.style.display = "none";
    this.visible = false;
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  /** Bind Esc to toggle. Returns unbind. */
  bindKey(): () => void {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") this.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }
}
