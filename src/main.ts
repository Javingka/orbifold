// SPDX-License-Identifier: AGPL-3.0-only
//
// ꩜ Orbifold — composición por geometría musical + Strudel + agente IA
// Interfaz basada en "The Geometry of Musical Chords" (Dmitri Tymoczko):
// los acordes son puntos en un orbifold (Tonnetz) y los voice-leadings son
// los caminos que trazas entre ellos. Los ritmos cíclicos viven en el mismo
// espacio: órbitas circulares.
//
// Strudel es AGPL-3.0. Si distribuyes esta app, debe ir bajo AGPL-3.0.
// https://www.gnu.org/licenses/agpl-3.0.en.html
//
// Bootstrap — mounts the Svelte App component onto #app.
// Built with Vite + TypeScript + Svelte (not a CDN prototype).

import App from './app/App.svelte';

const app = new App({
  target: document.getElementById('app') as HTMLElement,
});

export default app;
