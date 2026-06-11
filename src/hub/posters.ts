/**
 * Procedural poster art for world cards — painted straight onto each card's
 * canvas. No image assets (spec: ChatGPT poster art was cut; procedural is
 * the identity).
 */

export type PosterPainter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export const hollowmerePoster: PosterPainter = (ctx, w, h) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#f7d9a8");
  sky.addColorStop(0.6, "#e8a86a");
  sky.addColorStop(1, "#8a5a3a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Sun.
  ctx.fillStyle = "#fff0c8";
  ctx.beginPath();
  ctx.arc(w * 0.72, h * 0.3, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Rolling hill.
  ctx.fillStyle = "#5a7d3a";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.quadraticCurveTo(w * 0.5, h * 0.6, w, h * 0.75);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  // Cottage silhouette.
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(w * 0.28, h * 0.56, w * 0.26, h * 0.16);
  ctx.beginPath();
  ctx.moveTo(w * 0.24, h * 0.58);
  ctx.lineTo(w * 0.41, h * 0.44);
  ctx.lineTo(w * 0.58, h * 0.58);
  ctx.fill();
  ctx.fillRect(w * 0.47, h * 0.46, w * 0.04, h * 0.08); // chimney
  // Glowing window.
  ctx.fillStyle = "#ffd98a";
  ctx.fillRect(w * 0.34, h * 0.62, w * 0.05, h * 0.05);
  // The chicken (mandatory).
  ctx.fillStyle = "#f6f1e4";
  ctx.beginPath();
  ctx.ellipse(w * 0.68, h * 0.78, w * 0.04, w * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.71, h * 0.745, w * 0.018, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d4452f";
  ctx.fillRect(w * 0.705, h * 0.725, w * 0.012, h * 0.012);
};

export const nightMarketPoster: PosterPainter = (ctx, w, h) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0a0a1a");
  sky.addColorStop(1, "#1a1030");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Building blocks.
  ctx.fillStyle = "#12121f";
  ctx.fillRect(0, h * 0.25, w * 0.3, h * 0.75);
  ctx.fillRect(w * 0.7, h * 0.18, w * 0.3, h * 0.82);
  // Neon signs.
  const neon = (x: number, y: number, ww: number, hh: number, color: string) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, ww, hh);
    ctx.shadowBlur = 0;
  };
  neon(w * 0.06, h * 0.34, w * 0.18, h * 0.05, "#ff2a6a");
  neon(w * 0.08, h * 0.46, w * 0.14, h * 0.04, "#2ad8ff");
  neon(w * 0.74, h * 0.3, w * 0.2, h * 0.045, "#aa2aff");
  neon(w * 0.78, h * 0.42, w * 0.12, h * 0.04, "#3aff8a");
  // Wet street reflection.
  const street = ctx.createLinearGradient(0, h * 0.8, 0, h);
  street.addColorStop(0, "#1c1c2e");
  street.addColorStop(1, "#0c0c16");
  ctx.fillStyle = street;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  ctx.globalAlpha = 0.25;
  neon(w * 0.1, h * 0.84, w * 0.14, h * 0.1, "#ff2a6a");
  neon(w * 0.76, h * 0.83, w * 0.16, h * 0.12, "#aa2aff");
  ctx.globalAlpha = 1;
  // Noodle steam.
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w * (0.45 + i * 0.05), h * 0.75);
    ctx.quadraticCurveTo(w * (0.43 + i * 0.05), h * 0.65, w * (0.46 + i * 0.05), h * 0.55);
    ctx.stroke();
  }
};

export const windwardPoster: PosterPainter = (ctx, w, h) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  sky.addColorStop(0, "#8ad4f0");
  sky.addColorStop(1, "#d8f0f8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.65);
  // Sun.
  ctx.fillStyle = "#fff7d8";
  ctx.beginPath();
  ctx.arc(w * 0.25, h * 0.2, w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Sea.
  const sea = ctx.createLinearGradient(0, h * 0.65, 0, h);
  sea.addColorStop(0, "#2a8ab8");
  sea.addColorStop(1, "#1a5a88");
  ctx.fillStyle = sea;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);
  // Island.
  ctx.fillStyle = "#4a8a4a";
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.66);
  ctx.quadraticCurveTo(w * 0.55, h * 0.38, w * 0.8, h * 0.66);
  ctx.fill();
  // Shrine at the peak.
  ctx.fillStyle = "#e8e0c8";
  ctx.fillRect(w * 0.52, h * 0.42, w * 0.06, h * 0.05);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.43);
  ctx.lineTo(w * 0.55, h * 0.38);
  ctx.lineTo(w * 0.6, h * 0.43);
  ctx.fill();
  // Waves.
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const y = h * (0.72 + i * 0.06);
    ctx.moveTo(w * 0.1 * i, y);
    ctx.quadraticCurveTo(w * 0.3 + w * 0.1 * i, y - 6, w * 0.5 + w * 0.12 * i, y);
    ctx.stroke();
  }
};
