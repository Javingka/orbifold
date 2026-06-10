# Orbifold

Orbifold — a web-based live-coding music instrument built on Strudel, with a PIXI/WebGL Tonnetz interface and Tymoczko chord geometry.

## Live app

[https://Javingka.github.io/orbifold/](https://Javingka.github.io/orbifold/)

## What it is

Orbifold is built on [Strudel](https://strudel.cc) (a JavaScript port of TidalCycles) and renders a navigable Tonnetz with neo-Riemannian P·L·R transformations, Euclidean rhythms, and minimal voice-leading via Tymoczko's chord geometry. It includes a DAW-style composition timeline for arranging patterns and an AI agent that generates rhythm and harmony using your own API key — no Orbifold account required. No coding experience is needed; the live code is visible and pedagogical throughout.

## Stack

Vite · TypeScript (strict) · Svelte · PixiJS v7 · Strudel (`@strudel/web`) · Vitest · ESLint + Prettier.

## Run locally

```sh
pnpm install              # install dependencies
pnpm dev                  # start the Vite dev server (http://localhost:5173/orbifold/)
pnpm build                # produce a static dist/
pnpm test                 # run Vitest
pnpm lint                 # ESLint + Prettier check
pnpm exec tsc --noEmit    # typecheck
```

Note: audio requires HTTP(S). The app will not produce sound when opened from a `file://` URL.

## AI Agent

Open the Agent panel by clicking the robot icon in the toolbar. Enter your API key for OpenRouter, OpenAI, or Anthropic. The key is stored only in your browser's `localStorage` — it never leaves your device and no server is involved. Close the panel to dismiss it; clear site data to remove the stored key.

## License

AGPL-3.0, inherited from Strudel. If you distribute this app, the source code must be available under the same license. See `LICENSE`.
