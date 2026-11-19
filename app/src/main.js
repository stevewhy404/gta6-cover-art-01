// Neon Coast Cover Studio — wires the editor: photo slots, caption, layout, grade,
// drag-to-position, wheel zoom, undo/redo and PNG export. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).
import { drawCover, layoutPanels, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('stage');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const slotsEl = document.getElementById('slots');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');

const SAMPLES = ['pier', 'boulevard'];
const SLOT_NAMES = ['Hero panel', 'Panel two', 'Panel three', 'Panel four'];

const state = {
  caption: 'PIER PRESSURE',
  subtitle: 'golden hour heist',
  layout: 'hero',
  grade: 'sunset',
  size: '1080x1080',
  effects: { grain: true, halftone: true, vignette: true },
  slots: [
    { src: 'samples/pier.jpg', zoom: 1, ox: 0, oy: 0 },
    { src: 'samples/boulevard.jpg', zoom: 1, ox: 0, oy: 0 },
    { src: 'samples/pier.jpg', zoom: 1.15, ox: 0, oy: -0.04 },
    { src: 'samples/boulevard.jpg', zoom: 1.1, ox: 0, oy: 0.03 },
  ],
};
let photos = [null, null, null, null];
let activeSlot = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, { ...state, photos });
}

function snapshot() {
  return JSON.stringify({
    caption: state.caption,
    subtitle: state.subtitle,
    layout: state.layout,
    grade: state.grade,
    size: state.size,
    effects: state.effects,
    slots: state.slots,
  });
}

const past = [];
const future = [];
function remember() {
  past.push(snapshot());
  if (past.length > 60) past.shift();
  future.length = 0;
  syncHistoryButtons();
}
function applySnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, {
    caption: s.caption,
    subtitle: s.subtitle,
    layout: s.layout,
    grade: s.grade,
    size: s.size,
    effects: s.effects,
  });
  state.slots = s.slots;
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  syncChoiceButtons();
  syncSlotRows();
  reloadPhotos().then(redraw);
}
function syncHistoryButtons() {
  undoBtn.disabled = past.length === 0;
  redoBtn.disabled = future.length === 0;
}
undoBtn.addEventListener('click', () => {
  if (!past.length) return;
  future.push(snapshot());
  applySnapshot(past.pop());
  syncHistoryButtons();
});
redoBtn.addEventListener('click', () => {
  if (!future.length) return;
  past.push(snapshot());
  applySnapshot(future.pop());
  syncHistoryButtons();
});

function syncChoiceButtons() {
  document.querySelectorAll('#layouts .choice').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .choice').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes .choice').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === state.size));
  document.getElementById('fx-grain').checked = state.effects.grain;
  document.getElementById('fx-halftone').checked = state.effects.halftone;
  document.getElementById('fx-vignette').checked = state.effects.vignette;
}

function buildSlotRows() {
  state.slots.forEach((slot, i) => {
    const box = document.createElement('div');
    box.className = 'slot' + (i === activeSlot ? ' active' : '');
    box.dataset.slot = String(i);
    const sampleName = slot.src.startsWith('samples/')
      ? slot.src.slice('samples/'.length, -('.jpg'.length))
      : 'upload';
    box.innerHTML =
      '<div class="slot-head"><strong>' + SLOT_NAMES[i] + '</strong><span>' + sampleName + '</span></div>' +
      '<div class="slot-row">' +
        '<input type="file" accept="image/*" aria-label="Photo for ' + SLOT_NAMES[i] + '">' +
        '<select aria-label="Sample photo">' +
          '<option value="">Sample…</option>' +
          SAMPLES.map((s) => '<option value="' + s + '"' + (sampleName === s ? ' selected' : '') + '>' + s + '</option>').join('') +
        '</select>' +
      '</div>' +
      '<div class="sliders">' +
        '<span>Zoom</span><input type="range" min="1" max="2.5" step="0.01" value="' + slot.zoom + '" aria-label="Zoom">' +
        '<output>' + slot.zoom.toFixed(2) + '×</output>' +
        '<span>Left</span><input type="range" min="-0.4" max="0.4" step="0.01" value="' + slot.ox + '" aria-label="Horizontal offset">' +
        '<output>' + Math.round(slot.ox * 100) + '%</output>' +
        '<span>Up</span><input type="range" min="-0.4" max="0.4" step="0.01" value="' + slot.oy + '" aria-label="Vertical offset">' +
        '<output>' + Math.round(slot.oy * 100) + '%</output>' +
      '</div>';
    box.addEventListener('click', () => {
      activeSlot = i;
      document.querySelectorAll('.slot').forEach((el) => el.classList.toggle('active', Number(el.dataset.slot) === i));
    });
    const [fileInput, select, zoom, ox, oy] = [
      ...box.querySelectorAll('input[type="file"], select, input[type="range"]'),
    ];
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      remember();
      const url = URL.createObjectURL(file);
      photos[i] = await loadImage(url);
      state.slots[i].src = url;
      box.querySelector('.slot-head span').textContent = file.name;
      redraw();
    });
    select.addEventListener('change', async (e) => {
      if (!e.target.value) return;
      remember();
      photos[i] = await loadImage('samples/' + e.target.value + '.jpg');
      state.slots[i].src = 'samples/' + e.target.value + '.jpg';
      box.querySelector('.slot-head span').textContent = e.target.value;
      redraw();
    });
    const bindSlider = (input, key, format) => {
      input.addEventListener('input', () => {
        state.slots[i][key] = Number(input.value);
        input.parentElement.querySelector('output').textContent = format(Number(input.value));
        redraw();
      });
      input.addEventListener('change', remember);
    };
    bindSlider(zoom, 'zoom', (v) => v.toFixed(2) + '×');
    bindSlider(ox, 'ox', (v) => Math.round(v * 100) + '%');
    bindSlider(oy, 'oy', (v) => Math.round(v * 100) + '%');
    slotsEl.appendChild(box);
  });
}

function syncSlotRows() {
  slotsEl.innerHTML = '';
  buildSlotRows();
}

async function reloadPhotos() {
  photos = await Promise.all(state.slots.map(async (slot) => {
    try {
      return await loadImage(slot.src);
    } catch {
      return null;
    }
  }));
}

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
captionInput.addEventListener('change', remember);
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
subtitleInput.addEventListener('change', remember);

document.getElementById('layouts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-layout]');
  if (!b || !LAYOUTS.includes(b.dataset.layout)) return;
  remember();
  state.layout = b.dataset.layout;
  syncChoiceButtons();
  redraw();
});
document.getElementById('grades').addEventListener('click', (e) => {
  const b = e.target.closest('[data-grade]');
  if (!b || !GRADES[b.dataset.grade]) return;
  remember();
  state.grade = b.dataset.grade;
  syncChoiceButtons();
  redraw();
});
document.getElementById('sizes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-size]');
  if (!b || !SIZES[b.dataset.size]) return;
  state.size = b.dataset.size;
  syncChoiceButtons();
});
for (const [id, key] of [['fx-grain', 'grain'], ['fx-halftone', 'halftone'], ['fx-vignette', 'vignette']]) {
  document.getElementById(id).addEventListener('change', (e) => {
    remember();
    state.effects[key] = e.target.checked;
    redraw();
  });
}

// Drag a panel's photo to reposition it; scroll over the cover to zoom the panel.
let drag = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  const { panels } = layoutPanels(canvas.width, canvas.height, state.layout);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.hidden) continue;
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  activeSlot = i;
  document.querySelectorAll('.slot').forEach((el) => el.classList.toggle('active', Number(el.dataset.slot) === i));
  remember();
  drag = { slot: i, x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const slot = state.slots[drag.slot];
  slot.ox += (e.clientX - drag.x) / r.width;
  slot.oy += (e.clientY - drag.y) / r.height;
  slot.ox = Math.max(-0.4, Math.min(0.4, slot.ox));
  slot.oy = Math.max(-0.4, Math.min(0.4, slot.oy));
  drag.x = e.clientX;
  drag.y = e.clientY;
  syncSlotRows();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  e.preventDefault();
  remember();
  const slot = state.slots[i];
  slot.zoom = Math.max(1, Math.min(2.5, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  syncSlotRows();
  redraw();
}, { passive: false });

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, { ...state, photos });
  const name = 'neon-coast-' + state.size + '.png';
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    statusEl.textContent = 'Saved ' + name;
  }, 'image/png');
});

// Shot scenes for screenshots: ?shot=cover|editor with photo, caption, subtitle, layout, grade.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    async setup(opts) {
      if (opts.shot === 'cover') document.body.classList.add('shot-cover');
      state.caption = opts.caption;
      state.subtitle = opts.subtitle;
      state.layout = opts.layout;
      state.grade = opts.grade;
      captionInput.value = opts.caption;
      subtitleInput.value = opts.subtitle;
      syncChoiceButtons();
      state.slots = state.slots.map((s, i) => ({
        ...s,
        src: 'samples/' + (i === 0 ? opts.photo : SAMPLES[i % SAMPLES.length]) + '.jpg',
      }));
      await reloadPhotos();
      if (opts.shot === 'cover') {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      redraw();
    },
    redraw,
  });
} else {
  buildSlotRows();
  syncHistoryButtons();
  reloadPhotos().then(() => {
    redraw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  });
}
