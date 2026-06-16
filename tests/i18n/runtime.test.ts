// SPDX-License-Identifier: AGPL-3.0-only
// Unit tests for src/i18n/runtime.ts — pure i18n helpers.
// Tests resolution chain (D3), fallback lookup (D4), and interpolation (D5).
// No DOM required — all browser globals are injected as dependencies.
// Covers A-11-03, A-11-05, A-11-06, A-11-10.

import { describe, it, expect } from 'vitest';
import {
  resolveLang,
  lookup,
  interpolate,
  getAtPath,
  makeTFunction,
} from '../../src/i18n/runtime.js';
import type { ResolutionDeps, Locales } from '../../src/i18n/runtime.js';

// ── Fixture helpers ──────────────────────────────────────────────────────

function deps(overrides: Partial<ResolutionDeps> = {}): ResolutionDeps {
  return {
    search: '',
    getItem: () => null,
    navigatorLanguage: undefined,
    ...overrides,
  };
}

// Minimal locales fixture for fallback tests
const fixtureLocales: Locales = {
  es: {
    common: { langLabel: 'Idioma' },
    langs: { es: 'Español', en: 'English', pt: 'Português', zh: '中文' },
  } as Locales['es'],
  en: {
    common: { langLabel: 'Language' },
    langs: { es: 'Español', en: 'English', pt: 'Português', zh: '中文' },
  } as Locales['en'],
  pt: {
    common: { langLabel: 'Idioma' },
    langs: { es: 'Español', en: 'English', pt: 'Português', zh: '中文' },
  } as Locales['pt'],
  zh: {
    common: { langLabel: '语言' },
    langs: { es: 'Español', en: 'English', pt: 'Português', zh: '中文' },
  } as Locales['zh'],
};

// ── D3 — Resolution chain tests (A-11-03) ───────────────────────────────

describe('resolveLang — resolution chain (ADR 0017 D3)', () => {
  it('URL param ?lang=en → en', () => {
    expect(resolveLang(deps({ search: '?lang=en' }))).toBe('en');
  });

  it('URL param ?lang=pt → pt', () => {
    expect(resolveLang(deps({ search: '?lang=pt' }))).toBe('pt');
  });

  it('URL param ?lang=zh → zh', () => {
    expect(resolveLang(deps({ search: '?lang=zh' }))).toBe('zh');
  });

  it('URL param ?lang=es → es', () => {
    expect(resolveLang(deps({ search: '?lang=es' }))).toBe('es');
  });

  it('Unrecognized URL param → falls through to localStorage', () => {
    expect(resolveLang(deps({ search: '?lang=fr', getItem: () => 'pt' }))).toBe('pt');
  });

  it('Unrecognized URL param, no localStorage, navigator en-US → en', () => {
    expect(resolveLang(deps({ search: '?lang=xx', navigatorLanguage: 'en-US' }))).toBe('en');
  });

  it('localStorage orbifold.lang=en → en', () => {
    expect(resolveLang(deps({ getItem: (k) => (k === 'orbifold.lang' ? 'en' : null) }))).toBe('en');
  });

  it('localStorage orbifold.lang=pt → pt', () => {
    expect(resolveLang(deps({ getItem: () => 'pt' }))).toBe('pt');
  });

  it('Unrecognized localStorage value falls through to navigator', () => {
    expect(resolveLang(deps({ getItem: () => 'fr', navigatorLanguage: 'pt-BR' }))).toBe('pt');
  });

  it('navigator.language en-US → en', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'en-US' }))).toBe('en');
  });

  it('navigator.language pt-BR → pt', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'pt-BR' }))).toBe('pt');
  });

  it('navigator.language zh → zh (exact zh prefix)', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'zh' }))).toBe('zh');
  });

  it('navigator.language zh-TW → zh (zh-prefix special case)', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'zh-TW' }))).toBe('zh');
  });

  it('navigator.language zh-CN → zh (zh-prefix special case)', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'zh-CN' }))).toBe('zh');
  });

  it('navigator.language zh-HK → zh (zh-prefix special case)', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'zh-HK' }))).toBe('zh');
  });

  it('Unsupported navigator.language (fr-FR) → es (default)', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'fr-FR' }))).toBe('es');
  });

  it('Unsupported navigator.language (ja-JP) → es (default)', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'ja-JP' }))).toBe('es');
  });

  it('No URL param, no localStorage, no navigator → es (default)', () => {
    expect(resolveLang(deps())).toBe('es');
  });

  it('URL param takes precedence over localStorage', () => {
    expect(resolveLang(deps({ search: '?lang=en', getItem: () => 'pt' }))).toBe('en');
  });

  it('localStorage takes precedence over navigator', () => {
    expect(resolveLang(deps({ getItem: () => 'zh', navigatorLanguage: 'en-US' }))).toBe('zh');
  });

  it('navigator takes precedence over default', () => {
    expect(resolveLang(deps({ navigatorLanguage: 'en' }))).toBe('en');
  });
});

// ── Key-path navigation ───────────────────────────────────────────────────

describe('getAtPath', () => {
  const obj = { a: { b: { c: 'value' } }, x: 42 };

  it('resolves a nested dot-path', () => {
    expect(getAtPath(obj, 'a.b.c')).toBe('value');
  });

  it('returns undefined for missing path', () => {
    expect(getAtPath(obj, 'a.b.z')).toBeUndefined();
  });

  it('returns undefined when path traverses a non-object', () => {
    expect(getAtPath(obj, 'x.y')).toBeUndefined();
  });

  it('returns undefined for a number value (not a string)', () => {
    expect(getAtPath(obj, 'x')).toBeUndefined();
  });

  it('resolves a single-segment path', () => {
    expect(getAtPath({ hello: 'world' }, 'hello')).toBe('world');
  });
});

// ── D4 — Fallback lookup (A-11-05) ────────────────────────────────────────

describe('lookup — fallback semantics (ADR 0017 D4)', () => {
  it('returns active language value when key is present', () => {
    expect(lookup('common.langLabel', 'en', fixtureLocales)).toBe('Language');
  });

  it('returns es base value when key is missing in active dictionary', () => {
    // Simulate a dictionary missing a key by using a partial cast
    const localesWithGap: Locales = {
      ...fixtureLocales,
      en: {
        common: {
          langLabel: '', // empty — should fall back
        },
        langs: fixtureLocales.en.langs,
      },
    };
    expect(lookup('common.langLabel', 'en', localesWithGap)).toBe('Idioma');
  });

  it('returns es base value for a key missing in zh', () => {
    const localesWithGap: Locales = {
      ...fixtureLocales,
      zh: {
        common: { langLabel: '' }, // empty
        langs: fixtureLocales.zh.langs,
      },
    };
    expect(lookup('common.langLabel', 'zh', localesWithGap)).toBe('Idioma');
  });

  it('returns raw key when key is missing in both active and es', () => {
    expect(lookup('nonexistent.key', 'en', fixtureLocales)).toBe('nonexistent.key');
  });

  it('never returns blank — falls back to es', () => {
    const localesWithBlank: Locales = {
      ...fixtureLocales,
      pt: {
        common: { langLabel: '' },
        langs: fixtureLocales.pt.langs,
      },
    };
    const result = lookup('common.langLabel', 'pt', localesWithBlank);
    expect(result).not.toBe('');
    expect(result).toBe('Idioma');
  });

  it('es language uses es base directly (no fallback needed)', () => {
    expect(lookup('common.langLabel', 'es', fixtureLocales)).toBe('Idioma');
  });

  it('zh returns its own value when present', () => {
    expect(lookup('common.langLabel', 'zh', fixtureLocales)).toBe('语言');
  });
});

// ── D5 — Interpolation (A-11-06) ──────────────────────────────────────────

describe('interpolate — placeholder substitution (ADR 0017 D5)', () => {
  it('substitutes a single {name} placeholder', () => {
    expect(interpolate('Hola {name}', { name: 'Javier' })).toBe('Hola Javier');
  });

  it('substitutes multiple placeholders', () => {
    expect(interpolate('{a} + {b} = {c}', { a: '1', b: '2', c: '3' })).toBe('1 + 2 = 3');
  });

  it('leaves unmatched placeholder as-is (not blank)', () => {
    expect(interpolate('Hello {unknown}', {})).toBe('Hello {unknown}');
  });

  it('accepts number values', () => {
    expect(interpolate('pista {N}', { N: 3 })).toBe('pista 3');
  });

  it('handles zero as a valid value', () => {
    expect(interpolate('compás {bar}', { bar: 0 })).toBe('compás 0');
  });

  it('does not substitute when vars is undefined', () => {
    expect(interpolate('Hello {name}')).toBe('Hello {name}');
  });

  it('leaves template unchanged when no placeholders', () => {
    expect(interpolate('Sin variables', { x: 'y' })).toBe('Sin variables');
  });

  it('substitutes same placeholder used multiple times', () => {
    expect(interpolate('{n} de {n}', { n: '4' })).toBe('4 de 4');
  });

  it('preserves verbatim tokens (E(k,n)) outside placeholders', () => {
    // E(k,n) is NOT a {varName} placeholder — curly braces differ.
    const tpl = 'Vista previa · E({k},{n})';
    expect(interpolate(tpl, { k: '3', n: '8' })).toBe('Vista previa · E(3,8)');
  });
});

// ── makeTFunction integration ─────────────────────────────────────────────

describe('makeTFunction', () => {
  it('returns a function that translates keys', () => {
    const tf = makeTFunction('en', fixtureLocales);
    expect(tf('common.langLabel')).toBe('Language');
  });

  it('falls back to es when key missing in active lang', () => {
    const localesWithGap: Locales = {
      ...fixtureLocales,
      en: { common: { langLabel: '' }, langs: fixtureLocales.en.langs },
    };
    const tf = makeTFunction('en', localesWithGap);
    expect(tf('common.langLabel')).toBe('Idioma');
  });

  it('applies interpolation via vars argument', () => {
    const localesWithInterp: Locales = {
      ...fixtureLocales,
      es: {
        common: { langLabel: 'Idioma' },
        langs: fixtureLocales.es.langs,
      },
    };
    // Inject a key with a placeholder into the fixture
    (localesWithInterp.es as Record<string, unknown>)['test'] = { msg: 'Hola {who}' };
    const tf = makeTFunction('es', localesWithInterp);
    expect(tf('test.msg', { who: 'mundo' })).toBe('Hola mundo');
  });
});
