// Neon Coast Cover Studio — editor wiring.
// Owns the page state, loads photos (uploads or the AI-made samples), lets the
// user pick a panel, drag to pan and scroll to zoom, and exports PNG covers
// in 1080x1080, 1080x1350 and 1920x1080. No network request: everything runs
// from files under app/ and photos read on this machine.
import { GRADES, LAYOUTS, SIZES, layoutPanels, renderCoverArt, exportCoverCanvas, downloadCoverPng } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

/** Fresh default state: hero + three panels, sunset grade, one sample photo. */
export function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    gradeStrength: 70,
    title: 'NEON SHORE',
    subtitle: 'vice city nights',
    badge: 'EST. 2026',
    stars: 4,
    panels: Array.from({ length: 9 }, (_, i) => ({ photo: i % 2, zoom: 1, panX: 0, panY: 0 })),
  };
}

const state = defaultState();
let selectedPanel = 0;
/** Loaded photos: HTMLImageElement per slot, in upload/sample order. */
const photos = [];
const photoNames = [];

function status(text) {
  $('status').textContent = text;
}

/** Redraw the live preview from the current state. */
export function drawPreview() {
  const size = canvas.width;
  renderCoverArt(ctx, size, size, state, photos);
}

/** Refresh the panel sliders to match the selected panel. */
export function syncPanelControls() {
  const p = state.panels[selectedPanel];
  $('zoom').value = Math.round(p.zoom * 100);
  $('panX').value = Math.round(p.panX * 100);
  $('panY').value = Math.round(p.panY * 100);
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('panXVal').textContent = Math.round(p.panX * 100);
  $('panYVal').textContent = Math.round(p.panY * 100);
  $('photoStatus').textContent = `Selected panel: ${panelName(selectedPanel)} — photo “${photoNames[p.photo] ?? 'none'}”.`;
}

function panelName(i) {
  if (state.layout === 'fullbleed') return 'full-bleed';
  if (i === 0) return 'hero';
  return `panel ${i + 1}`;
}

/** Load an image from a URL or object URL into a photo slot. */
export function loadPhotoIntoSlot(src, name, slot) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      photos[slot] = img;
      photoNames[slot] = name;
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/** Load a bundled sample photo into a slot. */
export async function loadSample(name, slot) {
  const ok = await loadPhotoIntoSlot(`./samples/${name}.jpg`, `Sample · ${name}`, slot);
  if (ok) { drawPreview(); syncPanelControls(); }
  return ok;
}

function bindControls() {
  $('layout').addEventListener('change', (e) => {
    state.layout = e.target.value;
    selectedPanel = 0;
    syncPanelControls();
    drawPreview();
  });
  $('gradeRow').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-grade]');
    if (!btn) return;
    state.grade = btn.dataset.grade;
    document.querySelectorAll('#gradeRow .grade').forEach((b) => b.classList.toggle('selected', b === btn));
    drawPreview();
  });
  $('gradeStrength').addEventListener('input', (e) => {
    state.gradeStrength = Number(e.target.value);
    $('gradeVal').textContent = `${e.target.value}%`;
    drawPreview();
  });
  $('title').addEventListener('input', (e) => { state.title = e.target.value; drawPreview(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; drawPreview(); });
  $('badge').addEventListener('input', (e) => { state.badge = e.target.value; drawPreview(); });
  $('stars').addEventListener('change', (e) => { state.stars = Number(e.target.value); drawPreview(); });

  $('zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value) / 100;
    syncPanelControls(); drawPreview();
  });
  $('panX').addEventListener('input', (e) => {
    state.panels[selectedPanel].panX = Number(e.target.value) / 100;
    syncPanelControls(); drawPreview();
  });
  $('panY').addEventListener('input', (e) => {
    state.panels[selectedPanel].panY = Number(e.target.value) / 100;
    syncPanelControls(); drawPreview();
  });

  $('fillAll').addEventListener('click', () => {
    const photo = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    drawPreview();
    status('All panels now use the selected photo.');
  });
  $('shuffle').addEventListener('click', () => {
    const layouts = LAYOUTS.filter((l) => l !== state.layout);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    $('layout').value = state.layout;
    const grades = Object.keys(GRADES).filter((g) => g !== state.grade);
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    document.querySelectorAll('#gradeRow .grade').forEach((b) => b.classList.toggle('selected', b.dataset.grade === state.grade));
    state.panels.forEach((p) => { p.photo = Math.floor(Math.random() * Math.max(1, photos.length)); });
    drawPreview();
    status(`Shuffled to ${state.layout} + ${GRADES[state.grade].name}.`);
  });

  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 3);
    for (const file of files) {
      const slot = photos.length;
      if (slot >= 3) break;
      const url = URL.createObjectURL(file);
      await loadPhotoIntoSlot(url, file.name, slot);
    }
    drawPreview();
    syncPanelControls();
    status(`${photos.length} photo(s) loaded. Click a panel, then drag or zoom it.`);
  });
  $('photoRow').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-sample]');
    if (!btn) return;
    document.querySelectorAll('#photoRow .thumb').forEach((b) => b.classList.toggle('selected', b === btn));
    const slot = btn.dataset.sample === 'boulevard' ? 0 : 1;
    state.panels[selectedPanel].photo = slot;
    drawPreview();
    syncPanelControls();
  });

  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const [w, h] = btn.dataset.size.split('x').map(Number);
      await exportOne(w, h);
    });
  });
  $('exportAll').addEventListener('click', async () => {
    for (const s of SIZES) await exportOne(s.w, s.h);
    status('Exported all 3 sizes as PNG.');
  });
}

/** Export one size as a PNG download. */
export async function exportOne(w, h) {
  await document.fonts.ready;
  const out = exportCoverCanvas(state, photos, w, h);
  const name = `neon-coast-cover-${w}x${h}.png`;
  const ok = await downloadCoverPng(out, name);
  status(ok ? `Exported ${name}.` : 'Export failed — try again.');
  return ok;
}

/** Click a panel to select it; drag inside it to pan; scroll to zoom. */
function bindCanvas() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const panels = layoutPanels(state.layout, 1, 1);
    const hit = panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (hit >= 0) {
      selectedPanel = hit;
      syncPanelControls();
      drawPreview();
    }
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = canvas.getBoundingClientRect();
    const p = state.panels[selectedPanel];
    p.panX = Math.max(-1, Math.min(1, p.panX + ((e.clientX - lastX) / r.width) * 2));
    p.panY = Math.max(-1, Math.min(1, p.panY + ((e.clientY - lastY) / r.height) * 2));
    lastX = e.clientX;
    lastY = e.clientY;
    syncPanelControls();
    drawPreview();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[selectedPanel];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    syncPanelControls();
    drawPreview();
  }, { passive: false });
}

async function boot() {
  bindControls();
  bindCanvas();
  // Preload both bundled samples so the first paint already shows photos.
  await loadSample('boulevard', 0);
  await loadSample('pier', 1);
  await document.fonts.ready;
  drawPreview();
  syncPanelControls();
  // Fixed scenes for screenshots: ?shot=editor / ?shot=cover (see shots.js).
  const query = new URLSearchParams(location.search);
  if (query.has('shot')) {
    await runShot(query.get('shot'), query, { state, photos, loadSample, drawPreview });
  }
}

boot();
