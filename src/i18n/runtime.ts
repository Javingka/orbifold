// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — i18n pure runtime helpers (ADR 0017 D1, D3, D4, D5).
//
// This module contains ONLY pure functions with NO DOM or Svelte dependencies.
// It is importable from a Node/Vitest environment without a DOM.
// The Svelte store wrapper (src/i18n/index.ts) calls these helpers.
//
// Decisions implemented here:
//   D3 — Language resolution chain (mirrors public/landing.html `pickLang`)
//   D4 — Fallback lookup (missing key → es base; never a raw key or blank)
//   D5 — Interpolation ({varName} named placeholders; unmatched left as-is)

import type { Dictionary } from './types.js';

// ── Types ──────────────────────────────────────────────────────────────────

/** The four recognized language codes. */
export type LangCode = 'es' | 'en' | 'pt' | 'zh';

/** A record of all locale dictionaries. */
export type Locales = Record<LangCode, Dictionary>;

/** The translation function type (D1, D5). */
export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

// ── Recognized language codes ──────────────────────────────────────────────

const RECOGNIZED: ReadonlySet<string> = new Set<LangCode>(['es', 'en', 'pt', 'zh']);

function isRecognized(code: string): code is LangCode {
  return RECOGNIZED.has(code);
}

// ── D3 — Language resolution chain ────────────────────────────────────────
//
// Mirrors the `pickLang` function in public/landing.html (lines 647–659).
// Resolution order:
//   1. ?lang= URL search parameter (if present AND recognized)
//   2. localStorage['orbifold.lang'] (if set AND recognized)
//   3. navigator.language prefix match:
//      - anything starting with 'zh' → 'zh'
//      - split on '-', take the base code; if recognized → use it
//   4. 'es' (default)
//
// "Recognized" means the code is one of { es, en, pt, zh }.
// An unrecognized localStorage value does NOT block the navigator.language step.
//
// The function accepts injected dependencies (search, storage, nav) so it is
// fully testable in Node without any DOM globals.

export interface ResolutionDeps {
  /** Raw query string, e.g. '?lang=en'. Pass `location.search` in browsers. */
  search: string;
  /** A function returning the stored value for a key, or null. */
  getItem: (key: string) => string | null;
  /** The value of navigator.language, or undefined. */
  navigatorLanguage: string | undefined;
}

export const LS_KEY = 'orbifold.lang';

/**
 * Resolve the active language using the same chain as public/landing.html.
 *
 * @param deps  Injectable dependencies so this function is testable in Node.
 * @returns     One of 'es' | 'en' | 'pt' | 'zh'.
 */
export function resolveLang(deps: ResolutionDeps): LangCode {
  try {
    // 1. ?lang= URL parameter
    const urlParam = new URLSearchParams(deps.search).get('lang');
    if (urlParam && isRecognized(urlParam)) return urlParam;

    // 2. localStorage['orbifold.lang']
    const stored = deps.getItem(LS_KEY);
    if (stored && isRecognized(stored)) return stored;

    // 3. navigator.language prefix match
    const nav = (deps.navigatorLanguage ?? '').toLowerCase();
    if (nav) {
      // Special case: any code starting with 'zh' → 'zh'
      if (nav.startsWith('zh')) return 'zh';
      // Base code (before the first '-')
      const base = nav.split('-')[0];
      if (base && isRecognized(base)) return base;
    }
  } catch {
    // Defensive: localStorage access can throw in some sandboxed contexts.
  }

  // 4. Default
  return 'es';
}

// ── Key-path navigation ────────────────────────────────────────────────────

/**
 * Traverse a nested dictionary object using a dotted key path.
 *
 * E.g. `getAtPath({ common: { langLabel: 'Idioma' } }, 'common.langLabel')`
 * returns `'Idioma'`.
 *
 * Returns `undefined` if any segment along the path is missing or not an object.
 */
export function getAtPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

// ── D4 — Fallback lookup ──────────────────────────────────────────────────

/**
 * Look up a key in the active dictionary with `es` fallback (ADR 0017 D4).
 *
 * Chain:
 *   1. Active language dictionary → return if found and non-empty.
 *   2. `es` base dictionary → return if found.
 *   3. Return the raw key (development-only safety net; key-parity test prevents
 *      this in production).
 */
export function lookup(key: string, activeLang: LangCode, locales: Locales): string {
  // 1. Active language
  const fromActive = getAtPath(locales[activeLang], key);
  if (fromActive !== undefined && fromActive !== '') return fromActive;

  // 2. es fallback
  const fromEs = getAtPath(locales['es'], key);
  if (fromEs !== undefined) return fromEs;

  // 3. Raw key (development safety net)
  return key;
}

// ── D5 — Interpolation ────────────────────────────────────────────────────

/**
 * Replace `{varName}` placeholders in a template string with values from `vars`.
 *
 * - Unmatched placeholders are left as-is (never replaced with a blank).
 * - Numbers are coerced to their string representation.
 *
 * @param template  A string possibly containing `{name}` tokens.
 * @param vars      Optional map of variable names to replacement values.
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key]);
    }
    return match; // leave unmatched placeholder as-is
  });
}

// ── Combined translate function factory ───────────────────────────────────

/**
 * Build a `TFunction` for the given active language.
 *
 * This is called by the Svelte derived store in `index.ts` whenever `lang`
 * changes. The returned function is a closure over `activeLang` and `locales`.
 */
export function makeTFunction(activeLang: LangCode, locales: Locales): TFunction {
  return (key: string, vars?: Record<string, string | number>): string => {
    const raw = lookup(key, activeLang, locales);
    return interpolate(raw, vars);
  };
}
