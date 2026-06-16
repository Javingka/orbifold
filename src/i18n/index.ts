// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — i18n store layer (ADR 0017 D1, D3).
//
// Exports:
//   `lang`   — Svelte writable<LangCode>. Initialized at import time using the
//              resolution chain (D3). Write-back to localStorage on every change.
//   `t`      — Svelte derived store returning a TFunction. Components use `$t`.
//   `t_raw`  — One-shot translate function for non-component callers (D7).
//   `LANGS`  — Ordered list of {code, label} matching marketing LANGS constant (D3).
//   `LangCode` — Re-exported type.
//
// Pure helpers (resolution chain, fallback, interpolation) live in runtime.ts
// with no DOM or Svelte dependency so they can be unit-tested in Node (A-11-10).
//
// Write-back contract (D3): every call to lang.set(code) immediately writes
// `localStorage.setItem('orbifold.lang', code)` so marketing pages honor it.
// This mirrors public/landing.html line 664: localStorage.setItem(LS_KEY, code).

import { writable, derived, get } from 'svelte/store';

import { resolveLang, makeTFunction, LS_KEY } from './runtime.js';
import type { LangCode, Locales, TFunction } from './runtime.js';
import type { Dictionary } from './types.js';

import es from './locales/es.js';
import en from './locales/en.js';
import pt from './locales/pt.js';
import zh from './locales/zh.js';

export type { LangCode, TFunction };
export type { Dictionary };

// ── Locales registry ──────────────────────────────────────────────────────

const locales: Locales = { es, en, pt, zh };

// ── LANGS — mirrors marketing LANGS constant (D3) ─────────────────────────
// Order and native labels must match public/landing.html lines 302–307 exactly.

export const LANGS: ReadonlyArray<{ code: LangCode; label: string }> = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文' },
];

// ── Initial language resolution (D3) ──────────────────────────────────────
// Runs at module import time (before any component renders) so the first
// render is already in the correct language.
// Uses the browser globals (location.search, localStorage, navigator.language)
// only in browser context; falls back gracefully in Node/Vitest.

function resolveInitialLang(): LangCode {
  if (typeof window === 'undefined') {
    // Node/Vitest environment — default to 'es' (no DOM globals).
    return 'es';
  }
  return resolveLang({
    search: window.location.search,
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    navigatorLanguage: navigator.language,
  });
}

const initialLang = resolveInitialLang();

// ── lang store ────────────────────────────────────────────────────────────

export const lang = writable<LangCode>(initialLang);

// Write-back to localStorage on every change (D3).
// This subscriber runs immediately with the initial value, which is intentional
// (sets localStorage to match whatever resolution chain produced on init).
lang.subscribe((code) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_KEY, code);
    } catch {
      // localStorage unavailable in some sandboxed contexts; ignore.
    }
  }
});

// ── t derived store ───────────────────────────────────────────────────────
// Derived from `lang`; re-derives on every language change.
// Returns a TFunction that closes over the active lang and the locales registry.
// Components use: $t('key') or $t('key', { var: value })

export const t = derived<typeof lang, TFunction>(lang, ($lang) => makeTFunction($lang, locales));

// ── t_raw — one-shot translate outside Svelte components (D7) ─────────────
// Used by agent.ts buildContextAddendum / requestAutofix, which are not
// Svelte components and cannot use the $t auto-subscription syntax.

export function t_raw(key: string, vars?: Record<string, string | number>): string {
  return get(t)(key, vars);
}
