// Packs the static export (./out) into ./.preview for publishing as a private
// claude.ai Artifact preview. The artifact host serves files next to a launcher
// page, so: absolute /_next/ paths become relative, fonts and the noise texture
// are inlined, and the site itself is published as a standalone site.html.
//
//   npm run build && node scripts/preview-pack.mjs
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'out');
const DEST = join(root, '.preview');
if (!existsSync(join(OUT, 'index.html'))) throw new Error('Run `npm run build` first: ./out/index.html is missing.');

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
// The artifact host reserves top-level names starting with "_", so _next/ ships as next/.
const rel = (p) => p.replace(/(?<![.\w])\/_next\//g, './next/');
const dataUri = (file, mime) => `data:${mime};base64,${readFileSync(file).toString('base64')}`;

// 1. Static assets. Fonts are inlined into the CSS; the woff2 files still ship
//    because Next's inline payload carries preload hints that point at them.
for (const f of walk(join(OUT, '_next'))) {
  const r = relative(OUT, f);
  const to = join(DEST, r.replace(/^_next\//, 'next/'));
  mkdirSync(dirname(to), { recursive: true });
  if (r.endsWith('.css')) {
    const css = readFileSync(f, 'utf8')
      .replace(/url\(\/_next\/static\/media\/([^)]+)\)/g, (_, m) => `url(${dataUri(join(OUT, '_next/static/media', m), 'font/woff2')})`)
      .replace(/url\(\/noise\.png\)/g, `url(${dataUri(join(OUT, 'noise.png'), 'image/png')})`);
    writeFileSync(to, css);
  } else if (/webpack-[\w]+\.js$/.test(r)) {
    // Lazy chunks (GSAP, Lenis) load relative to the page, not the host root.
    writeFileSync(to, readFileSync(f, 'utf8').replace('.p="/_next/"', '.p="./next/"'));
  } else if (r.endsWith('.js')) {
    // The host rejects a raw U+FFFD; in Next's polyfills it only appears inside string
    // literals, where the \ufffd escape is the same value.
    writeFileSync(to, readFileSync(f, 'utf8').replace(/\uFFFD/g, '\\ufffd'));
  } else {
    cpSync(f, to);
  }
}

// 2. The site, as its own document (keeps <html>/<head> exactly as React hydrates them).
let html = readFileSync(join(OUT, 'index.html'), 'utf8');
html = html.replace(/<link rel="preload" href="\/_next\/static\/media\/[^"]+"[^>]*\/?>/g, '');
html = rel(html).replace(/href="\/favicon\.svg"/g, 'href="./favicon.svg"');
writeFileSync(join(DEST, 'site.html'), html);
cpSync(join(OUT, 'favicon.svg'), join(DEST, 'favicon.svg'));

// 3. The launcher: the artifact's page. It hands straight over to site.html.
writeFileSync(
  join(DEST, 'index.html'),
  `<title>Blind Ape Hoe</title>
<style>
  :root { color-scheme: dark; }
  html, body { height: 100%; background: #000; color: #fff; }
  body { margin: 0; display: grid; place-items: center; font: 16px/1.4 ui-monospace, Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; }
  a { color: #fff; border: 1px solid #fff; padding: 12px 18px; text-decoration: none; }
  a:hover, a:focus-visible { background: #fff; color: #000; }
</style>
<p><a id="go" href="site.html">Waking node ███ · open the site</a></p>
<script>try { location.replace('site.html' + location.hash); } catch (e) {}</script>
`,
);

const files = walk(DEST).map((f) => relative(DEST, f)).filter((f) => f !== 'index.html');
writeFileSync(join(DEST, 'files.json'), JSON.stringify(files, null, 2));
console.log(`packed ${files.length} files into .preview/`);
