import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

async function buildApp() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });

  await Promise.all([
    cp(path.join(rootDir, 'style.css'), path.join(distDir, 'style.css')),
    cp(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json')),
    cp(path.join(rootDir, 'icons'), path.join(distDir, 'icons'), { recursive: true }),
  ]);

  const [sourceHtml, swSource] = await Promise.all([
    readFile(path.join(rootDir, 'index.html'), 'utf8'),
    readFile(path.join(rootDir, 'sw.js'), 'utf8'),
  ]);

  // 1. Update HTML with bundled JS
  const bundledHtml = sourceHtml.replace(
    /<!-- Core Logic -->\s*<script src="logic\.js"><\/script>\s*<!-- App Logic -->\s*<script src="app\.js"><\/script>/,
    '<script defer src="assets/app.bundle.js"></script>'
  );
  await writeFile(path.join(distDir, 'index.html'), bundledHtml, 'utf8');

  // 2. Update sw.js with a unique cache name for this build
  const buildTimestamp = Date.now();
  const bundledSw = swSource.replace(
    /const CACHE_NAME = '.*';/,
    `const CACHE_NAME = 'quran-loop-build-${buildTimestamp}';`
  );
  await writeFile(path.join(distDir, 'sw.js'), bundledSw, 'utf8');

  await build({
    entryPoints: [path.join(rootDir, 'src', 'entry.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    outfile: path.join(assetsDir, 'app.bundle.js'),
    sourcemap: true,
    logLevel: 'info',
  });
}

buildApp().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
