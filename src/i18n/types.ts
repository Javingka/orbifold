// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — i18n Dictionary type (ADR 0017 D2).
//
// This type is the compile-time contract for all locale dictionaries.
// The `es` base dictionary (src/i18n/locales/es.ts) is the canonical
// source of truth; all other dictionaries must satisfy this same type.
//
// Key convention (OQ-3, ADR 0017 D2): nested by component/domain.
// `common.*` is reserved for shared cross-component labels.
//
// The type grows incrementally as strings are extracted in steps
// 11.4–11.5. The key-parity test (tests/i18n/key-parity.test.ts)
// enforces that all four locale files share the exact same key set.
//
// Step 11.3: seeded with only the keys needed for the header language
// selector. All other namespaces are added in steps 11.4–11.5.

export interface Dictionary {
  /** Common cross-component labels. */
  common: {
    /** "Language" label used in the selector button/aria */
    langLabel: string;
  };
  /** Language selector native language names (used in the dropdown). */
  langs: {
    es: string;
    en: string;
    pt: string;
    zh: string;
  };
}
