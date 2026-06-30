/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // base: '/' — use this instead if deploying to a custom domain at the root
  base: '/orbifold/',
  build: {
    outDir: 'dist',
  },
  test: {
    // @strudel/web has a module-scope `window.initStrudel = ...` assignment
    // that throws in Vitest's Node environment (no DOM). Test-only alias to
    // a local stub — see tests/mocks/strudel-web.ts. Production build is
    // unaffected; this `alias` lives under `test`, not the top-level `resolve`.
    alias: [
      {
        find: '@strudel/web',
        replacement: fileURLToPath(new URL('./tests/mocks/strudel-web.ts', import.meta.url)),
      },
    ],
  },
});
