// A tiny static server for app/ (Node 22, standard library only), so the cover
// studio can be tried locally without a build step:
//   node serve.ts            serves app/ on http://localhost:8080
//   node serve.ts --port 9000
// It only serves files under app/, sends the MIME types an offline web app needs,
// and otherwise does nothing clever: a development convenience, not a web server
// for the internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const byExtension = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
]);

function pickPort() {
  const at = process.argv.indexOf('--port');
  const want = at === -1 ? 8080 : Number(process.argv[at + 1]);
  return Number.isInteger(want) && want > 0 && want < 65536 ? want : 8080;
}

function resolveInsideApp(pathname) {
  const cleaned = normalize(pathname);
  const target = resolve(join(appRoot, cleaned));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) return null;
  return target;
}

createServer((request, response) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolveInsideApp(pathname);
  if (!file) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': byExtension.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(pickPort(), '127.0.0.1', function ready() {
  console.log(`app/ is on http://localhost:${pickPort()}`);
});
