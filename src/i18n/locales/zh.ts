// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Chinese (中文) locale dictionary.
//
// ADR 0017 D2: must satisfy Dictionary and pass the key-parity test.
// Step 11.3: seeded with only the keys needed for the header language selector.
// Steps 11.4–11.5 add translated strings for all remaining keys.
// Step 11.6 adds full translations (replacing any es-mirror values).

import type { Dictionary } from '../types.js';

const zh: Dictionary = {
  common: {
    langLabel: '语言',
  },
  langs: {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    zh: '中文',
  },
};

export default zh;
