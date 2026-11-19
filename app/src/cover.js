// Neon Coast Cover Studio — the cover engine.
// Draws GTA-poster-style multi-panel cover art on a 2D canvas: panels of the
// user's photos, a Vice City sunset/neon grade, bold Anton lettering with a
// Pacifico script subtitle, a badge ribbon and a heat-meter of stars.
// No Rockstar art, logo or font anywhere: all lettering is Anton / Bebas Neue /
// Pacifico (SIL Open Font License, vendored under app/fonts/).

export const GRADES = {
  sunset: { sky: ['#2b1055', '#ff5e3a', '#ffb02e'], wash: '#ff7a18', ink: '#fff3e0', name: 'Sunset' },
  neon: { sky: ['#0b1035', '#7b2ff7', '#ff2e88'], wash: '#00e5ff', ink: '#eafcff', name: 'Neon Night' },
  gold: { sky: ['#3d1e00', '#ef476f', '#ffd166'], wash: '#ffb703', ink: '#fff8e6', name: 'Palm Gold' },
  teal: { sky: ['#04141c', '#0f766e', '#06d6a0'], wash: '#06d6a0', ink: '#e6fffa', name: 'Teal Noir' },
  pop: { sky: ['#2d0a4e', '#8338ec', '#ffbe0b'], wash: '#ff006e', ink: '#fffbe6', name: 'Pop Ink' },
};

export const LAYOUTS = ['hero3', 'grid4', 'fullbleed', 'tilted', 'nine', 'strip'];
export const SIZES = [
  { label: '1080 x 1080', w: 1080, h: 1080 },
  { label: '1080 x 1350', w: 1080, h: 1350 },
  { label: '1920 x 1080', w: 1920, h: 1080 },
];

/** Panel rects (unit coords) for a layout, in draw order. `tilt` flags rotated panels. */
export function layoutPanels(layout, W, H) {
  const gap = 0.012;
  const full = { x: 0, y: 0, w: 1, h: 1, tilt: 0 };
  switch (layout) {
    case 'grid4':
      return [
        { x: 0, y: 0, w: 0.5 - gap / 2, h: 0.5 - gap / 2, tilt: 0 },
        { x: 0.5 + gap / 2, y: 0, w: 0.5 - gap / 2, h: 0.5 - gap / 2, tilt: 0 },
        { x: 0, y: 0.5 + gap / 2, w: 0.5 - gap / 2, h: 0.5 - gap / 2, tilt: 0 },
        { x: 0.5 + gap / 2, y: 0.5 + gap / 2, w: 0.5 - gap / 2, h: 0.5 - gap / 2, tilt: 0 },
      ];
    case 'fullbleed':
      return [full];
    case 'tilted':
      return [
        { x: 0, y: 0, w: 1, h: 0.58, tilt: 0 },
        { x: 0.03, y: 0.6, w: 0.44, h: 0.36, tilt: -0.05 },
        { x: 0.53, y: 0.6, w: 0.44, h: 0.36, tilt: 0.04 },
      ];
    case 'nine': {
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          cells.push({ x: c / 3 + gap / 2, y: r / 3 + gap / 2, w: 1 / 3 - gap, h: 1 / 3 - gap, tilt: 0 });
        }
      }
      return cells;
    }
    case 'strip':
      return [
        { x: 0, y: 0, w: 0.62 - gap / 2, h: 1, tilt: 0 },
        { x: 0.62 + gap / 2, y: 0, w: 0.38 - gap / 2, h: 0.5 - gap / 2, tilt: 0 },
        { x: 0.62 + gap / 2, y: 0.5 + gap / 2, w: 0.38 - gap / 2, h: 0.5 - gap / 2, tilt: 0 },
      ];
    case 'hero3':
    default:
      return [
        { x: 0, y: 0, w: 1, h: 0.6, tilt: 0 },
        { x: 0, y: 0.6 + gap, w: 1 / 3 - gap * 2 / 3, h: 0.4 - gap, tilt: 0 },
        { x: 1 / 3 + gap / 3, y: 0.6 + gap, w: 1 / 3 - gap * 2 / 3, h: 0.4 - gap, tilt: 0 },
        { x: 2 / 3 + gap * 2 / 3, y: 0.6 + gap, w: 1 / 3 - gap * 2 / 3, h: 0.4 - gap, tilt: 0 },
      ];
  }
}

/** Cover-fit source rect for an image inside a panel, with zoom and pan (-1..1). */
export function coverFitRect(imgW, imgH, boxW, boxH, zoom, panX, panY) {
  const scale = Math.max(boxW / imgW, boxH / imgH) * zoom;
  const sw = boxW / scale;
  const sh = boxH / scale;
  // Bias the crop toward the top of the photo (faces sit high) instead of
  // dead-centre, which beheads subjects in wide panels.
  const sx = (imgW - sw) / 2 + (panX * (imgW - sw)) / 2;
  const sy = (imgH - sh) * 0.2 + (panY * (imgH - sh)) / 2;
  return { sx: Math.max(0, Math.min(imgW - sw, sx)), sy: Math.max(0, Math.min(imgH - sh, sy)), sw, sh };
}

/** A deterministic speckled noise canvas, reused for the grain overlay. */
let noiseCanvas = null;
export function grainTile(size = 128) {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = size;
  noiseCanvas.height = size;
  const nctx = noiseCanvas.getContext('2d');
  const data = nctx.createImageData(size, size);
  let seed = 20261119;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = seed % 256;
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  return noiseCanvas;
}

/** Draw one photo into one panel rect, with the grade wash and a white frame. */
export function drawPanelPhoto(ctx, img, rect, panel, grade, strength) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const fit = coverFitRect(img.naturalWidth, img.naturalHeight, w, h, panel.zoom, panel.panX, panel.panY);
    ctx.drawImage(img, fit.sx, fit.sy, fit.sw, fit.sh, x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a1c5e'); g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  // Warm sunset wash + neon edge light, strength from the slider.
  const wash = ctx.createLinearGradient(x, y + h, x + w, y);
  wash.addColorStop(0, grade.wash);
  wash.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.25 + (strength / 100) * 0.55;
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
  // Thick white poster frame around the panel.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(3, w * 0.012);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.restore();
}

/** Halftone dots across the title band, fading toward the right. */
export function drawHalftoneDots(ctx, x, y, w, h, maxR) {
  ctx.save();
  const step = Math.max(10, maxR * 2.4);
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const fade = 1 - (xx - x) / w;
      ctx.fillStyle = `rgba(255,255,255,${(0.28 * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(xx, yy, Math.max(0.6, maxR * fade), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The title block: gradient band, Anton title, Pacifico subtitle, badge, stars. */
export function drawTitleBlock(ctx, W, H, state, grade) {
  const bandH = H * 0.17;
  const bandY = H - bandH;
  const band = ctx.createLinearGradient(0, bandY, W, H);
  band.addColorStop(0, grade.sky[1]);
  band.addColorStop(0.55, grade.sky[0]);
  band.addColorStop(1, '#0a0514');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, H - bandY);
  drawHalftoneDots(ctx, W * 0.62, bandY + 6, W * 0.36, bandH - 12, Math.max(3, H * 0.006));
  // Sun disc peeking over the band, left of the badge ribbon.
  ctx.save();
  const sunR = H * 0.05;
  const sunX = W * 0.72;
  const sun = ctx.createRadialGradient(sunX, bandY, 4, sunX, bandY, sunR);
  sun.addColorStop(0, '#fff7cc');
  sun.addColorStop(0.6, grade.wash);
  sun.addColorStop(1, 'rgba(255,46,136,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, bandY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const pad = W * 0.04;
  const title = (state.title || 'NEON SHORE').toUpperCase();
  const titleSize = Math.min(H * 0.105, (W - pad * 2) / Math.max(4, title.length * 0.62));
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${titleSize}px Anton, "Arial Black", sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,5,20,0.85)';
  ctx.lineWidth = titleSize * 0.14;
  ctx.strokeText(title, pad, bandY + bandH * 0.58);
  const titleGrad = ctx.createLinearGradient(pad, bandY, pad, bandY + bandH * 0.7);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.55, grade.ink);
  titleGrad.addColorStop(1, grade.wash);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, pad, bandY + bandH * 0.58);
  // Script subtitle tucked under the title.
  const subSize = Math.max(H * 0.028, titleSize * 0.32);
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillStyle = '#ffd9ec';
  ctx.fillText(state.subtitle || '', pad + 2, bandY + bandH * 0.88);
  ctx.restore();

  drawBadgeRibbon(ctx, W, H, state, grade);
  drawHeatStars(ctx, W, H, state);
}

/** Rotated badge ribbon at the top-right of the title band. */
export function drawBadgeRibbon(ctx, W, H, state, grade) {
  const text = (state.badge || '').trim();
  if (!text) return;
  ctx.save();
  const bw = Math.min(W * 0.24, text.length * H * 0.022 + H * 0.05);
  const bh = H * 0.042;
  ctx.translate(W * 0.86, H - H * 0.085);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.strokeStyle = '#0a0514';
  ctx.lineWidth = 2;
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
  ctx.fillStyle = '#0a0514';
  ctx.font = `${bh * 0.52}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, 1);
  ctx.restore();
}

/** Heat meter: five stars, filled per state.stars, bottom-right of the band. */
export function drawHeatStars(ctx, W, H, state) {
  const n = state.stars ?? 4;
  const r = H * 0.016;
  const gap = r * 2.6;
  const total = gap * 5;
  const x0 = W - W * 0.04 - total;
  const y = H - H * 0.028;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const cx = x0 + gap * i + r;
    ctx.fillStyle = i < n ? '#ffb02e' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const ang = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(ang) * rr;
      const py = y + Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Grain + vignette finish over the whole cover. */
export function drawGrainOverlay(ctx, W, H) {
  const tile = grainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(5,2,12,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Render the full cover into ctx at W x H.
 * `state`: { layout, grade, gradeStrength, title, subtitle, badge, stars, panels: [{photo, zoom, panX, panY}] }
 * `images`: array of HTMLImageElement (or null) indexed by photo slot.
 */
export function renderCoverArt(ctx, W, H, state, images) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  // Sunset sky backdrop behind everything.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(state.layout, W, H);
  const gapPx = W * 0.012;
  panels.forEach((p, i) => {
    const panelState = state.panels[i] || { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const img = images[panelState.photo] ?? null;
    const rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    ctx.save();
    if (p.tilt) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(p.tilt);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    // Drop shadow under each panel.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(rect.x + 6, rect.y + 8, rect.w, rect.h);
    drawPanelPhoto(ctx, img, rect, panelState, grade, state.gradeStrength ?? 70);
    ctx.restore();
  });

  // White outer border, poster style.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(4, W * 0.008);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  ctx.restore();

  drawTitleBlock(ctx, W, H, state, grade);
  drawGrainOverlay(ctx, W, H);
  // Keep the gap gutters clean: redraw the frame on top of the grain.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  ctx.restore();
  void gapPx;
}

/** Render the cover at export size and return the canvas. */
export function exportCoverCanvas(state, images, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCoverArt(canvas.getContext('2d'), w, h, state, images);
  return canvas;
}

/** Download a canvas as a PNG file. */
export function downloadCoverPng(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(true);
    }, 'image/png');
  });
}
