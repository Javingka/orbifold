// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Spanish (Español) locale dictionary — base / source-of-truth.
//
// ADR 0017 D2: `es` is the canonical base. Its key set defines the complete
// Dictionary type. All other locale files must satisfy the same Dictionary type
// and are checked for key-parity by tests/i18n/key-parity.test.ts.
//
// Step 11.3: seeded with only the keys needed for the header language selector.
// Steps 11.4–11.5 add the remaining 161 catalogued strings.

import type { Dictionary } from '../types.js';

const es: Dictionary = {
  common: {
    langLabel: 'Idioma',
  },
  langs: {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    zh: '中文',
  },
};

export default es;
