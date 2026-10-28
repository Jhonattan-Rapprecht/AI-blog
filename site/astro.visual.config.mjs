import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// This separate static project is intentionally outside site/src. The normal
// production build never discovers or emits these local visual-test routes.
export default defineConfig({
  srcDir: './visual-harness/src',
  site: 'http://localhost:4323',
  output: 'static',
  outDir: '../dist-visual-harness',
  server: { host: '127.0.0.1', port: 4323 },
  vite: { plugins: [tailwindcss()] },
});
