// Neon Coast cover engine: draws a multi-panel GTA-style poster cover onto a canvas.
// Every backdrop element is procedural — gradient sky, slatted sun, skyline, palms,
// bands and lettering are all drawn in code. The only photographs are the ones the
// person loads on their own machine, one per panel.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#160a2e', '#7a2a6e', '#ff7e5f', '#feb47b'],
    sun: '#ffd76a',
    sunCore: '#fff3c4',
    accent: '#ff2e88',
    band: '#fdf6ec',
    bandInk: '#1c1030',
    scrim: 'rgba(26, 8, 46, 0.55)',
  },
  neon: {
    label: 'Neon nights',
    sky: ['#07031a', '#2a0a5e', '#c2187a', '#00c2ff'],
    sun: '#ff5df2',
    sunCore: '#ffe9fb',
    accent: '#00e5ff',
    band: '#0d0a1f',
    bandInk: '#f4eefc',
    scrim: 'rgba(4, 2, 24, 0.6)',
  },
  vice: {
    label: 'Vice pink',
    sky: ['#2d0a4e', '#8f1d7a', '#ff5da2', '#ffc4dd'],
    sun: '#ff9ecf',
    sunCore: '#fff0f7',
    accent: '#ff71ce',
    band: '#fff0f7',
    bandInk: '#2d0a4e',
    scrim: 'rgba(45, 10, 78, 0.5)',
  },
  midnight: {
    label: 'Midnight',
    sky: ['#030612', '#0d1b4c', '#274690', '#f5a623'],
    sun: '#f8e7c8',
    sunCore: '#ffffff',
    accent: '#f5a623',
    band: '#0a0f24',
    bandInk: '#f4eefc',
    scrim: 'rgba(3, 6, 18, 0.62)',
  },
};

export const LAYOUTS = ['hero', 'grid4', 'fullbleed', 'tilted'];
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** Panel rectangles (fractions of the canvas) for a layout, plus the title band. */
export function layoutPanels(w, h, layout) {
  const bandH = h * 0.155;
  const bandY = h - bandH;
  const gap = w * 0.018;
  const top = h * 0.035;
  const bottom = bandY - h * 0.02;
  const full = { x: w * 0.035, y: top, w: w * 0.93, h: bottom - top };
  if (layout === 'fullbleed') {
    return { panels: [{ ...full, x: 0, y: 0, w, h: bandY, tilt: 0 }], band: { x: 0, y: bandY, w, h: bandH } };
  }
  if (layout === 'grid4') {
    const pw = (full.w - gap) / 2;
    const ph = (full.h - gap) / 2;
    return {
      panels: [
        { x: full.x, y: full.y, w: pw, h: ph, tilt: 0 },
        { x: full.x + pw + gap, y: full.y, w: pw, h: ph, tilt: 0 },
        { x: full.x, y: full.y + ph + gap, w: pw, h: ph, tilt: 0 },
        { x: full.x + pw + gap, y: full.y + ph + gap, w: pw, h: ph, tilt: 0 },
      ],
      band: { x: 0, y: bandY, w, h: bandH },
    };
  }
  if (layout === 'tilted') {
    const heroH = full.h * 0.6;
    const smallH = full.h * 0.34;
    const sw = (full.w - gap) / 2;
    return {
      panels: [
        { x: full.x + w * 0.01, y: full.y, w: full.w, h: heroH, tilt: -2.2 },
        { x: full.x, y: full.y + heroH + gap, w: sw, h: smallH, tilt: 1.6 },
        { x: full.x + sw + gap, y: full.y + heroH + gap, w: sw, h: smallH, tilt: -1.4 },
        { x: full.x + w * 0.22, y: full.y + heroH + smallH + gap * 0.4, w: sw, h: smallH * 0.4, tilt: 0, hidden: true },
      ],
      band: { x: 0, y: bandY, w, h: bandH },
    };
  }
  // hero: one wide hero panel, three small panels beneath it.
  const heroH = full.h * 0.62;
  const smallH = full.h - heroH - gap;
  const sw = (full.w - gap * 2) / 3;
  return {
    panels: [
      { x: full.x, y: full.y, w: full.w, h: heroH, tilt: 0 },
      { x: full.x, y: full.y + heroH + gap, w: sw, h: smallH, tilt: 0 },
      { x: full.x + sw + gap, y: full.y + heroH + gap, w: sw, h: smallH, tilt: 0 },
      { x: full.x + (sw + gap) * 2, y: full.y + heroH + gap, w: sw, h: smallH, tilt: 0 },
    ],
    band: { x: 0, y: bandY, w, h: bandH },
  };
}

function mulberry(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSky(ctx, w, h, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Slatted synthwave sun, low on the horizon.
  const cx = w * 0.72;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.17;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, grade.sunCore);
  sun.addColorStop(1, grade.sun);
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = grade.sky[0];
  let y = cy + r * 0.05;
  let gapH = h * 0.004;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gapH);
    y += gapH + r * 0.16;
    gapH *= 1.55;
  }
  ctx.restore();
  // Stars in the upper sky.
  const rnd = mulberry(20261120);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 70; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h * 0.3;
    const sr = rnd() * 1.6 + 0.4;
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSkyline(ctx, w, h, grade) {
  const horizon = h * 0.78;
  const rnd = mulberry(77);
  ctx.fillStyle = 'rgba(12, 6, 28, 0.85)';
  let x = -w * 0.02;
  while (x < w * 1.02) {
    const bw = w * (0.04 + rnd() * 0.07);
    const bh = h * (0.08 + rnd() * 0.2);
    ctx.fillRect(x, horizon - bh, bw, bh);
    // Lit windows.
    ctx.fillStyle = 'rgba(255, 214, 106, 0.85)';
    for (let wy = horizon - bh + h * 0.015; wy < horizon - h * 0.01; wy += h * 0.028) {
      for (let wx = x + w * 0.008; wx < x + bw - w * 0.008; wx += w * 0.02) {
        if (rnd() < 0.4) ctx.fillRect(wx, wy, w * 0.007, h * 0.011);
      }
    }
    ctx.fillStyle = 'rgba(12, 6, 28, 0.85)';
    x += bw + w * 0.012;
  }
  // Palm silhouettes at the edges.
  const palm = (px, s, lean) => {
    ctx.save();
    ctx.translate(px, horizon + h * 0.01);
    ctx.rotate(lean);
    ctx.strokeStyle = 'rgba(8, 4, 20, 0.95)';
    ctx.lineWidth = w * 0.008;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(w * 0.01, -h * 0.09, w * 0.02, -h * 0.16);
    ctx.stroke();
    ctx.lineWidth = w * 0.005;
    for (let f = 0; f < 7; f++) {
      const a = -Math.PI * (0.08 + f * 0.13);
      ctx.beginPath();
      ctx.moveTo(w * 0.02, -h * 0.16);
      ctx.quadraticCurveTo(
        w * 0.02 + Math.cos(a) * w * 0.05, -h * 0.16 + Math.sin(a) * h * 0.05,
        w * 0.02 + Math.cos(a) * w * 0.09, -h * 0.16 + Math.sin(a) * h * 0.09 + h * 0.02,
      );
      ctx.stroke();
    }
    ctx.restore();
  };
  palm(w * 0.04, 1, -0.12);
  palm(w * 0.96, 1, 0.14);
}

function drawPanelPhoto(ctx, img, rect, slot, grade) {
  if (!img) {
    ctx.fillStyle = '#241a3d';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const zoom = slot.zoom || 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  // A wide panel crops a photo hard top-to-bottom: anchor the photo near its
  // top (where faces are) instead of centring it, or the hero loses the face.
  const anchorY = rect.w / rect.h > 1.3 ? 0.18 : 0.5;
  const dx = rect.x + (rect.w - pw) / 2 + (slot.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - ph) * anchorY + (slot.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  // Grade wash, stronger at the foot of each panel.
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(255, 126, 95, 0)');
  wash.addColorStop(1, 'rgba(255, 46, 136, 0.28)');
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  // White poster border.
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, rect.w * 0.008);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawTitleBand(ctx, band, state, grade) {
  ctx.fillStyle = grade.band;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(band.x, band.y, band.w, Math.max(3, band.h * 0.045));
  if (state.effects.halftone) {
    const rnd = mulberry(9);
    const dotGap = Math.max(7, band.h * 0.16);
    for (let y = band.y + band.h * 0.55; y < band.y + band.h; y += dotGap) {
      for (let x = band.x + dotGap / 2; x < band.x + band.w; x += dotGap) {
        const depth = (y - band.y) / band.h;
        ctx.fillStyle = `rgba(28, 16, 48, ${0.1 + depth * 0.22})`;
        ctx.beginPath();
        ctx.arc(x, y, dotGap * (0.12 + depth * 0.22) * (0.8 + rnd() * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const caption = (state.caption || '').trim().toUpperCase() || 'UNTITLED';
  const cx = band.x + band.w * 0.045;
  const cy = band.y + band.h * 0.62;
  let size = band.h * 0.52;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const fit = () => {
    ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
    return ctx.measureText(caption).width <= band.w * 0.72;
  };
  while (!fit() && size > band.h * 0.2) size -= 2;
  ctx.font = `${size}px Anton, "Arial Narrow", sans-serif`;
  // Chunky offset outline, then the face.
  ctx.fillStyle = grade.accent;
  ctx.fillText(caption, cx + size * 0.045, cy + size * 0.045);
  ctx.fillStyle = grade.bandInk;
  ctx.fillText(caption, cx, cy);
  // Script subtitle tucked under the caption's left edge, kept inside the band.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.font = `${band.h * 0.24}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, cx, band.y + band.h * 0.87);
  }
  // Heat meter + badge ribbon, right-aligned to the band's right edge so the
  // fallback star glyphs can never run off the canvas.
  const rightEdge = band.x + band.w * 0.96;
  ctx.textAlign = 'right';
  ctx.font = `${band.h * 0.3}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = grade.bandInk;
  ctx.fillText('★ ★ ★ ★ ★', rightEdge, band.y + band.h * 0.38);
  ctx.font = `${band.h * 0.22}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = grade.accent;
  ctx.fillText('N E O N   C O A S T', rightEdge, band.y + band.h * 0.72);
  ctx.textAlign = 'left';
}

function drawGrain(ctx, w, h) {
  const rnd = mulberry(4242);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.4, 1.4);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 500; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.2, 1.2);
  }
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the whole cover. `state` holds photos (Image or null, one per panel),
 * slots (zoom/ox/oy per panel), caption, subtitle, layout, grade and effects.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS.includes(state.layout) ? state.layout : 'hero';
  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, w, h, grade);
  drawSkyline(ctx, w, h, grade);
  const { panels, band } = layoutPanels(w, h, layout);
  panels.forEach((rect, i) => {
    if (rect.hidden) return;
    ctx.save();
    if (rect.tilt) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.tilt * Math.PI) / 180);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    drawPanelPhoto(ctx, state.photos[i] || null, rect, state.slots[i] || {}, grade);
    ctx.restore();
  });
  // Soft scrim where the title band meets the art.
  ctx.fillStyle = grade.scrim;
  ctx.fillRect(0, band.y - h * 0.02, w, h * 0.02);
  drawTitleBand(ctx, band, state, grade);
  if (state.effects.grain) drawGrain(ctx, w, h);
  if (state.effects.vignette) drawVignette(ctx, w, h);
}
