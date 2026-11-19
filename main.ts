// Neon Coast Cover Studio — the entry program (Node 22, standard library only).
// It hands the app in: copies app/ and screenshots/ from beside this file into
// /output and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and serve the app itself with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countEntries(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += 1;
    if (statSync(p).isDirectory()) n += countEntries(p);
  }
  return n;
}

function handIn() {
  mkdirSync(outDir, { recursive: true });
  // A re-run must not keep stale files from an earlier hand-in: clear the two
  // trees this program owns before copying the repo's current files in.
  rmSync(join(outDir, 'app'), { recursive: true, force: true });
  rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });
  cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
  const shotsOut = join(outDir, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(repoRoot, 'screenshots');
  if (existsSync(shotsIn)) cpSync(shotsIn, shotsOut, { recursive: true });
  const shots = readdirSync(shotsOut).filter((f) => !f.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  if (countEntries(join(outDir, 'app')) > 993) {
    throw new Error('app/ holds more than 993 files and directories');
  }
  // The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
  // dossier's bytes; the rest refuse an entry the scorer would refuse anyway.
  writeFileSync(
    join(outDir, 'dossier.json'),
    buildDossier(outDir, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      app_max_files: 993,
      app_max_bytes: 50331648,
      app_path_max_bytes: 1000,
    }),
  );
  return shots.length;
}

const handed = handIn();
console.log(`handed in ${handed} screenshots to ${outDir}`);
