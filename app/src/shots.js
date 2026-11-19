// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the cover alone, full frame. `photo` picks the hero sample,
// `caption` / `subtitle` the words, `layout` and `grade` the look.
// window.__shotReady is set once the scene has painted, so a screenshot tool knows
// the frame is final.
export async function runShot(shot, query, api) {
  const scene = {
    shot,
    photo: query.get('photo') ?? 'pier',
    caption: query.get('caption') ?? 'Pier Pressure',
    subtitle: query.get('subtitle') ?? 'golden hour heist',
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
  };
  await api.setup(scene);
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('80px Anton'),
        document.fonts.load('40px Pacifico'),
        document.fonts.load('30px "Bebas Neue"'),
      ]);
    } catch {
      // Fallbacks still draw; the shot must not hang on a font.
    }
    await document.fonts.ready;
  }
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
