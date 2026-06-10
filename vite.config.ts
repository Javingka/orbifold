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
});
