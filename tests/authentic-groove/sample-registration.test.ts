// SPDX-License-Identifier: AGPL-3.0-only
// Tests for buildSampleMap — pure helper exported from src/audio/strudel.ts.
//
// Strategy (per Phase 04 inventory §3): import.meta.env.BASE_URL injection is
// bypassed entirely by calling buildSampleMap with an explicit base string.
// The helper lives in src/audio/sample-map.ts — a standalone pure module with
// zero browser-API imports — so tests can import it without triggering the
// @strudel/web module-scope browser-only initialisation (which requires window).
// The actual Vite injection and samples() call inside initAudio() are covered by
// the end-to-end propagation tests (step 04.5) and by browser/dev-server runtime
// testing.

import { describe, it, expect } from 'vitest';
import { buildSampleMap } from '../../src/audio/sample-map.js';

describe('buildSampleMap', () => {
  it('returns correct keys for production base', () => {
    const map = buildSampleMap('/orbifold/');
    expect(Object.keys(map).sort()).toEqual(['cajon', 'conga', 'wood']);
  });

  it('all conga URLs start with base + samples/', () => {
    const map = buildSampleMap('/orbifold/');
    expect(map.conga.every((u) => u.startsWith('/orbifold/samples/'))).toBe(true);
  });

  it('conga has 4 entries ending in .ogg', () => {
    const map = buildSampleMap('/orbifold/');
    expect(map.conga).toHaveLength(4);
    expect(map.conga.every((u) => u.endsWith('.ogg'))).toBe(true);
  });

  it('cajon has 4 entries', () => {
    const { cajon } = buildSampleMap('/orbifold/');
    expect(cajon).toHaveLength(4);
  });

  it('cajon URLs start with base + samples/', () => {
    const { cajon } = buildSampleMap('/orbifold/');
    expect(cajon.every((u) => u.startsWith('/orbifold/samples/'))).toBe(true);
  });

  it('wood has 4 entries', () => {
    const { wood } = buildSampleMap('/orbifold/');
    expect(wood).toHaveLength(4);
  });

  it('wood URLs start with base + samples/', () => {
    const { wood } = buildSampleMap('/orbifold/');
    expect(wood.every((u) => u.startsWith('/orbifold/samples/'))).toBe(true);
  });

  it('handles trailing slash normalization (base without trailing slash)', () => {
    const map1 = buildSampleMap('/orbifold/');
    const map2 = buildSampleMap('/orbifold');
    expect(map1).toEqual(map2);
  });

  it('dev-server base (/) produces correct URLs', () => {
    const map = buildSampleMap('/');
    expect(map.conga[0]).toBe('/samples/conga_0.ogg');
  });

  it('conga files are named conga_0 through conga_3', () => {
    const map = buildSampleMap('/orbifold/');
    expect(map.conga).toEqual([
      '/orbifold/samples/conga_0.ogg',
      '/orbifold/samples/conga_1.ogg',
      '/orbifold/samples/conga_2.ogg',
      '/orbifold/samples/conga_3.ogg',
    ]);
  });

  it('cajon files are named cajon_0 through cajon_3', () => {
    const map = buildSampleMap('/orbifold/');
    expect(map.cajon).toEqual([
      '/orbifold/samples/cajon_0.ogg',
      '/orbifold/samples/cajon_1.ogg',
      '/orbifold/samples/cajon_2.ogg',
      '/orbifold/samples/cajon_3.ogg',
    ]);
  });

  it('wood files are named wood_0 through wood_3', () => {
    const map = buildSampleMap('/orbifold/');
    expect(map.wood).toEqual([
      '/orbifold/samples/wood_0.ogg',
      '/orbifold/samples/wood_1.ogg',
      '/orbifold/samples/wood_2.ogg',
      '/orbifold/samples/wood_3.ogg',
    ]);
  });
});
