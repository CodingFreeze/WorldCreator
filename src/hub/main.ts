import type { WorldHandle } from "@engine/core/World";
import { WORLDS, type WorldEntry } from "./registry";

const FONT = "Georgia, 'Times New Roman', serif";

/**
 * WorldCreator hub: poster-card world select. Click a card to lazy-load and
 * boot that world; an in-world button returns here (world disposed).
 */
export function bootHub(container: HTMLElement): void {
  container.style.position = "relative";
  showSelect(container);
}

function showSelect(container: HTMLElement): void {
  container.replaceChildren();
  document.body.style.background = "#15100a";

  const screen = document.createElement("div");
  screen.style.cssText = [
    "width:100%",
    "height:100%",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:34px",
    "background:radial-gradient(ellipse at 50% 30%, #2a2118 0%, #15100a 70%)",
    `font-family:${FONT}`,
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "WorldCreator";
  title.style.cssText =
    "color:#e8c478;font-size:44px;letter-spacing:6px;text-shadow:0 2px 18px rgba(232,196,120,0.35)";
  const subtitle = document.createElement("div");
  subtitle.textContent = "small worlds, fully procedural — pick one";
  subtitle.style.cssText = "color:#9a8a6a;font-size:15px;letter-spacing:2px;margin-top:-22px";

  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:26px;flex-wrap:wrap;justify-content:center";

  for (const entry of WORLDS) row.appendChild(card(entry, container));

  const hint = document.createElement("div");
  hint.textContent = "WASD move · mouse look · E talk · click attack · Q magic · F mischief · K save";
  hint.style.cssText = "color:#6a5a44;font-size:13px;letter-spacing:1px";

  screen.append(title, subtitle, row, hint);
  container.appendChild(screen);
}

function card(entry: WorldEntry, container: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  const playable = entry.load !== null;
  el.style.cssText = [
    "width:230px",
    "border-radius:12px",
    "overflow:hidden",
    `border:2px solid ${playable ? entry.accent : "#3a3328"}`,
    "background:#1d1812",
    playable ? "cursor:pointer" : "cursor:default",
    "transition:transform 0.18s ease, box-shadow 0.18s ease",
    playable ? "" : "opacity:0.55",
  ].join(";");

  const canvas = document.createElement("canvas");
  canvas.width = 230;
  canvas.height = 290;
  canvas.style.cssText = "display:block;width:100%";
  const ctx = canvas.getContext("2d");
  if (ctx) entry.poster(ctx, canvas.width, canvas.height);

  const label = document.createElement("div");
  label.style.cssText = "padding:12px 14px 14px";
  const name = document.createElement("div");
  name.textContent = entry.title + (playable ? "" : " — coming soon");
  name.style.cssText = `color:${playable ? "#f2e8d8" : "#8a7a60"};font-size:17px;font-family:${FONT}`;
  const tag = document.createElement("div");
  tag.textContent = entry.tagline;
  tag.style.cssText = `color:#9a8a6a;font-size:12.5px;line-height:1.4;margin-top:5px;font-family:${FONT}`;
  label.append(name, tag);
  el.append(canvas, label);

  if (playable) {
    el.onmouseenter = () => {
      el.style.transform = "translateY(-6px)";
      el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.5), 0 0 24px ${entry.accent}44`;
    };
    el.onmouseleave = () => {
      el.style.transform = "";
      el.style.boxShadow = "";
    };
    el.onclick = () => void enterWorld(entry, container);
  }
  return el;
}

async function enterWorld(entry: WorldEntry, container: HTMLElement): Promise<void> {
  if (!entry.load) return;
  container.replaceChildren();
  const loading = document.createElement("div");
  loading.textContent = `entering ${entry.title}…`;
  loading.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e8c478;font-size:20px;letter-spacing:3px;font-family:${FONT};background:#15100a`;
  container.appendChild(loading);

  const { boot } = await entry.load();
  container.replaceChildren();
  const handle: WorldHandle = await boot(container);

  // Back-to-hub button overlays every world.
  const back = document.createElement("button");
  back.textContent = "⟵ worlds";
  back.style.cssText = [
    "position:absolute",
    "left:14px",
    "top:12px",
    "z-index:20",
    "background:rgba(24,18,12,0.75)",
    "border:1px solid #c9a25e",
    "border-radius:6px",
    "color:#e8c478",
    "padding:6px 12px",
    `font-family:${FONT}`,
    "font-size:13px",
    "cursor:pointer",
  ].join(";");
  back.onclick = () => {
    handle.dispose();
    showSelect(container);
  };
  container.appendChild(back);
}
