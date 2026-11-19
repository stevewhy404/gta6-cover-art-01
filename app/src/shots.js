// Fixed scenes for screenshots, driven by ?shot=… in the URL.
// ?shot=editor shows the editor with a sample photo loaded (the default view).
// ?shot=cover shows the exported cover alone, full frame, at the requested
// size: ?shot=cover&size=1920x1080 (default), 1080x1350 or 1080x1080.
// window.__shotReady is set once the scene has painted, so a screenshot
// taken after it is stable.
import { renderCoverArt } from './cover.js';

function paintWhenReady(done) {
  requestAnimationFrame(() => requestAnimationFrame(done));
}

export async function runShot(shot, query, app) {
  const { state, photos, loadSample, drawPreview } = app;
  const photo = query.get('photo') ?? 'boulevard';
  const caption = query.get('caption') ?? 'NEON SHORE';
  const subtitle = query.get('subtitle') ?? 'vice city nights';
  const layout = query.get('layout') ?? state.layout;
  const grade = query.get('grade') ?? state.grade;
  state.title = caption;
  state.subtitle = subtitle;
  state.layout = layout;
  state.grade = grade;
  const layoutSel = document.getElementById('layout');
  if (layoutSel) layoutSel.value = layout;
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = caption;

  await loadSample(photo, 0);
  if (photo === 'boulevard') await loadSample('pier', 1);
  else await loadSample('boulevard', 1);
  state.panels.forEach((p, i) => { p.photo = i % 2; });
  await document.fonts.ready;

  if (shot === 'cover') {
    const [w, h] = (query.get('size') ?? '1920x1080').split('x').map(Number);
    const canvas = document.getElementById('cover');
    canvas.width = w;
    canvas.height = h;
    document.body.classList.add('shot-cover');
    renderCoverArt(canvas.getContext('2d'), w, h, state, photos);
    paintWhenReady(() => { window.__shotReady = true; });
    return;
  }
  // Editor scene: the normal page, photo loaded, preview painted.
  drawPreview();
  paintWhenReady(() => { window.__shotReady = true; });
}
