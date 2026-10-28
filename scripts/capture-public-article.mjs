import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.argv[2];
if (!url || !/^https?:\/\/localhost(?::\d+)?\//.test(url)) {
  console.error('Usage: node scripts/capture-public-article.mjs http://localhost:4321/blog/article-slug');
  process.exit(2);
}

const edge = process.env.EDGE_EXECUTABLE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!existsSync(edge)) { console.error(`Edge executable not found: ${edge}`); process.exit(2); }
const outputDir = resolve('docs/development/visual-baselines/phase-4/captures');
mkdirSync(outputDir, { recursive: true });
const slug = new URL(url).pathname.split('/').filter(Boolean).join('-').replace(/[^a-z0-9-]/gi, '-') || 'article';

function pngDimensions(path) {
  const data = readFileSync(path);
  if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Invalid PNG: ${path}`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

async function capture(name, width, height) {
  const path = resolve(outputDir, `${slug}-${name}-${width}x${height}.png`);
  await new Promise((resolvePromise, reject) => {
    const child = spawn(edge, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb',
      '--virtual-time-budget=3500', '--run-all-compositor-stages-before-draw',
      `--window-size=${width},${height}`, `--screenshot=${path}`, url,
    ], { stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`Edge exited with ${code}`)));
  });
  if (!existsSync(path) || statSync(path).size === 0) throw new Error(`Screenshot was not written: ${path}`);
  const dimensions = pngDimensions(path);
  if (dimensions.width !== width || dimensions.height !== height) throw new Error(`Unexpected screenshot dimensions for ${path}: ${dimensions.width}x${dimensions.height}`);
  console.log(`${path} (${dimensions.width}x${dimensions.height}, ${statSync(path).size} bytes)`);
}

try {
  await capture('desktop', 1440, 1000);
  await capture('mobile', 390, 844);
} catch (error) {
  console.error(`Public screenshot capture failed: ${error.message}`);
  process.exit(1);
}
