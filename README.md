# ꩜ Orbifold

A web-based live-coding music instrument built on [Strudel](https://strudel.cc), with a PIXI/WebGL interface and a sober "Apple"-like aesthetic. It organizes music with Tymoczko's chord geometry: a navigable Tonnetz, neo-Riemannian P·L·R transformations, minimal voice-leading, and Euclidean rhythms — plus a DAW-style composition timeline and an AI agent that creates rhythm/harmony and updates the UI.

For musicians and the curious — no coding required. The code is optional and visible (pedagogical).

## Stack

Vite · TypeScript (strict) · Svelte · PixiJS v7 · Strudel (`@strudel/web`) · Vitest · ESLint + Prettier.

## Development

```sh
pnpm install              # install dependencies
pnpm dev                  # start the Vite dev server
pnpm build                # produce a static dist/
pnpm test                 # run Vitest
pnpm lint                 # ESLint + Prettier check
pnpm exec tsc --noEmit    # typecheck
```

Audio starts only after a user gesture, and the app must be served over HTTP(S) — browser audio does not start from `file://`.

## License

[AGPL-3.0](LICENSE), inherited from Strudel. If you distribute this app, the source must be available under AGPL-3.0.
