// SPDX-License-Identifier: AGPL-3.0-only
// Key-parity test (ADR 0017 D2, D4 — A-11-09).
//
// Verifies that all four locale dictionaries (en, pt, zh) export the exact
// same set of keys as the `es` base dictionary — no missing keys, no extra
// keys. A failing test means a non-base dictionary is incomplete or has a typo
// in a key name.
//
// This test is intentionally DOM-free — it imports the locale TS modules
// directly and compares their flattened key sets.

import { describe, it, expect } from 'vitest';
import es from '../../src/i18n/locales/es.js';
import en from '../../src/i18n/locales/en.js';
import pt from '../../src/i18n/locales/pt.js';
import zh from '../../src/i18n/locales/zh.js';

// ── Flatten nested object to dot-paths ───────────────────────────────────

/**
 * Flatten a nested object to an array of dotted key paths where the leaf value
 * is a string. E.g. `{ a: { b: 'x' } }` → `['a.b']`.
 */
function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [];
  const keys: string[] = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') {
      keys.push(fullKey);
    } else if (typeof val === 'object' && val !== null) {
      keys.push(...flattenKeys(val, fullKey));
    }
  }
  return keys.sort();
}

// ── Reference key set from `es` ───────────────────────────────────────────

const esKeys = flattenKeys(es);

// ── Helpers ───────────────────────────────────────────────────────────────

function missingKeys(base: string[], other: string[]): string[] {
  const otherSet = new Set(other);
  return base.filter((k) => !otherSet.has(k));
}

function extraKeys(base: string[], other: string[]): string[] {
  const baseSet = new Set(base);
  return other.filter((k) => !baseSet.has(k));
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Key-parity — all locales must have the exact same keys as es (ADR 0017 D2)', () => {
  it('es has at least the selector keys (sanity check)', () => {
    expect(esKeys).toContain('common.langLabel');
    expect(esKeys).toContain('langs.es');
    expect(esKeys).toContain('langs.en');
    expect(esKeys).toContain('langs.pt');
    expect(esKeys).toContain('langs.zh');
  });

  it('en has no missing keys relative to es', () => {
    const missing = missingKeys(esKeys, flattenKeys(en));
    expect(missing).toEqual([]);
  });

  it('en has no extra keys relative to es', () => {
    const extra = extraKeys(esKeys, flattenKeys(en));
    expect(extra).toEqual([]);
  });

  it('pt has no missing keys relative to es', () => {
    const missing = missingKeys(esKeys, flattenKeys(pt));
    expect(missing).toEqual([]);
  });

  it('pt has no extra keys relative to es', () => {
    const extra = extraKeys(esKeys, flattenKeys(pt));
    expect(extra).toEqual([]);
  });

  it('zh has no missing keys relative to es', () => {
    const missing = missingKeys(esKeys, flattenKeys(zh));
    expect(missing).toEqual([]);
  });

  it('zh has no extra keys relative to es', () => {
    const extra = extraKeys(esKeys, flattenKeys(zh));
    expect(extra).toEqual([]);
  });

  it('all non-es locales have identical key sets to es', () => {
    for (const [code, dict] of [
      ['en', en],
      ['pt', pt],
      ['zh', zh],
    ] as const) {
      const dictKeys = flattenKeys(dict);
      expect(
        missingKeys(esKeys, dictKeys),
        `${code} is missing keys: ${missingKeys(esKeys, dictKeys).join(', ')}`
      ).toEqual([]);
      expect(
        extraKeys(esKeys, dictKeys),
        `${code} has extra keys: ${extraKeys(esKeys, dictKeys).join(', ')}`
      ).toEqual([]);
    }
  });
});
