// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Canvas 2D Pentagrama layer.
//
// Phase 10 redesign step 10.11 (ADR 0015 D7):
//   Module-level singleton managing a dedicated Canvas 2D <canvas> element
//   mounted inside the PIXI stage container. Provides the lifecycle API used
//   by App.svelte: initPentagrama / destroyPentagrama / setPentagramaVisible.
//
//   This file is render-layer code (src/render/), not core (src/core/), so DOM
//   imports are permitted. No PIXI, no Svelte.
//
// ADR 0015 decisions implemented across steps 10.11–10.14:
//   D3 — responsive staff geometry (LS, cy, SL, PX, DPR cap).
//   D4 — note-name → staff position via inline MIDI conversion + ported m2p.
//   D5 — arpeggio stagger: per-cycle (not per-slot), intentional divergence from prototype pArp.
//   D6 — interaction wiring: DOM pointer events on the Canvas 2D element.
//   D7 — lifecycle: rAF loop + ResizeObserver owned by this module.
//
// Step 10.12: adds full static paint(ts) layer — staff lines, clef, time grid,
//   chord/arp/rest slots, tonal-function badges, right vignette.
//
// Step 10.13: adds time-driven dynamic layer — ambient background breathe,
//   actIdx helper, active-slot spotlight, pChord/pArp onset pulse (isAct branch),
//   and playhead driven by getVisualPhaseAnchor() (shared anchor, not prototype's
//   local this.ps — ensures sync with ProgressionStrip cursor).
//
// Step 10.14: adds full slot interaction model — module-level interaction state,
//   hover rendering, selection chrome, move ghost, resize preview, and pointer
//   event listeners (onDn/onMv/onUp). Hit-testing delegates to staff-hit.ts with
//   the SL offset (ADR 0015 D6). Store actions: clearChordAt, setChordBars,
//   reorderSlot — same as ProgressionStrip (ADR 0014 D1). No codegen changes.
//
// Prototype parity source: docs/orbifold-v2/reference/Pentagrama.dc.html
//   m2p:         lines 160–165
//   ny:          line 168
//   slotX:       lines 173–176
//   slotW:       line 179
//   totalW:      line 171
//   rr:          lines 202–212
//   ha:          line 238
//   ldg:         lines 215–235
//   pChord:      lines 421–465 (isAct pulse added step 10.13)
//   pArp:        lines 468–497 (INTENTIONAL DIVERGENCE: per-cycle stagger; isAct pulse step 10.13)
//   pRest:       lines 500–506
//   paint breathe: lines 255–260 (ambient background breathe)
//   paint spotlight: lines 262–274 (active-slot spotlight)
//   paint grid:  lines 277–306 (time grid + bar numbers)
//   paint staff: lines 301–306 (5-line staff)
//   paint badge: lines 336–344 (tonal-function badges)
//   paint hover: lines 315–329 (hover rect + label)
//   paint selection chrome: lines 346–372 (isSel block)
//   paint move ghost: lines 375–394 (drag.mode==='moving' block)
//   phX:         lines 182–186 (playhead — DIVERGENCE: shared anchor not this.ps)
//   actIdx:      lines 188–199 (active-slot index — DIVERGENCE: shared anchor not this.ps)
//   paint vign:  lines 413–415 (right vignette)
//   hitSlot:     lines 509–514 (REPLACED by staff-hit.ts hitTestSlot with SL offset)
//   insertPos:   lines 516–525 (REPLACED by staff-hit.ts nearestInsertionIndex with SL offset)
//   onDn:        lines 528–558 (ported; staff-hit.ts replaces hitSlot/insertPos)
//   onMv:        lines 560–575 (ported; staff-hit.ts replaces hitSlot)
//   onUp:        lines 578–590 (ported; reorderSlot store action replaces prototype splice)

import { get } from 'svelte/store';
import { sessionStore, isNoteSlot } from '../state/session.js';
import type { ProgressionSlot, Chord, NoteSlot, SessionState } from '../state/session.js';
import {
  clearChordAt,
  setChordBars,
  reorderSlot,
  clampBars,
  setNoteOffset,
  setNoteAttrs,
} from '../state/session.js';
import { selectedSlotIdxStore } from '../state/selectedSlot.js';
import type { Quality } from '../core/theory/chords.js';
import { chordVoicing, chordLabel } from '../core/theory/chords.js';
import { diatonicLookup } from '../core/theory/scales.js';
import type { Mode } from '../core/theory/scales.js';
import { NOTE_NAMES } from '../core/theory/pitch.js';
import { getVisualPhaseAnchor } from '../state/phase-anchor.js';
import {
  computeSlotBounds,
  hitTestSlot,
  hitTestResizeHandle,
  nearestInsertionIndex,
} from '../core/harmony/staff-hit.js';
import type { SlotBounds } from '../core/harmony/staff-hit.js';

// ── Constants (ADR 0015 D3) ──────────────────────────────────────────────────

const PX = 48; // pixels per cycle (= PX_PER_CYCLE from time-map.ts)
const SL = 76; // staff left x — clef gutter
const BH = 10; // sustain bar height
const OR = 4.5; // gemstone onset circle radius

/** Tonal-function color map (CLAUDE.md §guardrails). */
const FC: Record<string, string> = {
  tonic: '#f3b15a',
  subdom: '#56cfc4',
  dom: '#e87bac',
};
/** Per-voice colors: voice 0 = tonic, voice 1 = subdom, voice 2 = dom. */
const VC = ['#f3b15a', '#56cfc4', '#e87bac'];

// ── Note-name → MIDI conversion (ADR 0015 D4, inventory OQ-R2) ──────────────
// chordVoicing() returns sharp-only note names: "C4", "C#4", "D4", etc.
// Flat aliases are added defensively but not produced by chordVoicing in practice.

const CHROMA_PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
  Bb: 10,
  Eb: 3,
  Ab: 8,
  Db: 1,
  Gb: 6,
};

/** Parse a scientific-notation note string (e.g. "C#4") to a MIDI integer. */
function noteNameToMidi(name: string): number {
  // name is NOTE_NAMES[pc] + octave, e.g. "C#4" or "A3"
  const match = /^([A-G][b#]?)(-?\d+)$/.exec(name);
  if (match === null) return 60; // fallback to C4 on parse error
  const pc = CHROMA_PC[match[1]] ?? 0;
  const octave = parseInt(match[2], 10);
  return pc + (octave + 1) * 12;
}

// ── Music-theory helpers (ported verbatim from prototype) ────────────────────

/**
 * MIDI → { pos: diatonic steps from B4 (centre = 0), sh: sharp? }
 * Ported verbatim from prototype Pentagrama.dc.html lines 160–165.
 * Verification: midi=71 (B4) → (5-5)*7 + 6 - 6 = 0. Correct.
 */
function m2p(midi: number): { pos: number; sh: boolean } {
  const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const D: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const n = N[midi % 12] ?? 'C';
  const sh = n.length > 1;
  const b = sh ? n[0] : n;
  return { pos: (Math.floor(midi / 12) - 5) * 7 + (D[b] ?? 0) - 6, sh };
}

/**
 * Diatonic staff position → canvas y (anchored to H/2, NOT cy).
 * Ported verbatim from prototype Pentagrama.dc.html line 168.
 * Note: this anchors to H/2, not cy. Staff lines are at cy−n×ls.
 * Per ADR 0015 D3 §"Coordinate system note", the two anchors coexist.
 */
function ny(pos: number, H: number, ls: number): number {
  return H / 2 - pos * (ls / 2);
}

// ── Layout helpers ────────────────────────────────────────────────────────────

/**
 * Left edge of slot i (in canvas x, includes SL offset).
 * Ported from prototype slotX (lines 173–176), using ProgressionSlot.bars.
 */
function slotX(i: number, progression: readonly ProgressionSlot[]): number {
  let x = SL;
  for (let j = 0; j < i; j++) {
    const slot = progression[j];
    if (slot !== undefined) x += (slot.bars ?? 1) * PX;
  }
  return x;
}

/**
 * Width of a slot in pixels.
 * Ported from prototype slotW (line 179).
 */
function slotW(slot: ProgressionSlot): number {
  return (slot.bars ?? 1) * PX;
}

/**
 * Total width of all slots combined (excluding SL).
 * Ported from prototype totalW (line 171).
 */
function totalW(progression: readonly ProgressionSlot[]): number {
  return progression.reduce((s, sl) => s + (sl.bars ?? 1) * PX, 0);
}

// ── Active-slot index helper (step 10.13) ─────────────────────────────────────

/**
 * Compute the currently-playing slot index from the shared visual phase anchor.
 *
 * Ported from prototype actIdx (Pentagrama.dc.html lines 188–199).
 *
 * INTENTIONAL DIVERGENCE: The prototype uses `this.ps` (a local timestamp set when
 * the demo starts). This implementation uses `getVisualPhaseAnchor()` — the shared
 * anchor from phase-anchor.ts — so the Pentagrama playhead stays in lockstep with
 * ProgressionStrip's cursor rAF tick (same barMs, same rawX formula, same modulo wrap).
 *
 * Returns −1 when:
 *   - nowPlaying.source === null (nothing is playing), or
 *   - totalCycles === 0 (empty progression).
 *
 * @param state — current SessionState read from sessionStore
 */
function actIdx(state: SessionState): number {
  if (state.nowPlaying.source === null) return -1;
  const progression = state.harmony.progression;
  const bpm = state.bpm > 0 ? state.bpm : 120;
  const totalCycles = progression.reduce((s, sl) => s + (sl.bars ?? 1), 0);
  if (totalCycles === 0) return -1;

  const barMs = (60000 / bpm) * 4;
  const elapsedMs = performance.now() - getVisualPhaseAnchor();
  // phase = fractional-bar position within the full progression loop.
  // Double-modulo ensures positive result even if elapsedMs < 0 (clock drift).
  const loopMs = totalCycles * barMs;
  const phase = (((elapsedMs % loopMs) + loopMs) % loopMs) / barMs;

  let acc = 0;
  for (let i = 0; i < progression.length; i++) {
    acc += progression[i]?.bars ?? 1;
    if (phase < acc) return i;
  }
  return 0;
}

// ── Canvas utilities (ported verbatim from prototype) ────────────────────────

/**
 * Rounded-rect path helper.
 * Ported verbatim from prototype Pentagrama.dc.html lines 202–212.
 */
function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  const r = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Float 0–1 → 2-char hex alpha string.
 * Ported verbatim from prototype Pentagrama.dc.html line 238.
 */
function ha(v: number): string {
  return Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, '0');
}

/**
 * Draw ledger lines above/below the 5-line staff for out-of-staff notes.
 * Ported verbatim from prototype Pentagrama.dc.html lines 215–235.
 * Uses H (not cy) for ny() — per ADR 0015 D3 coordinate-system note.
 */
function ldg(ctx: CanvasRenderingContext2D, pos: number, nx: number, H: number, ls: number): void {
  if (Math.abs(pos) <= 4) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 1;
  const lw = 20;
  if (pos < 0) {
    const end = pos % 2 === 0 ? pos : pos + 1;
    for (let p = -6; p >= end; p -= 2) {
      const y = ny(p, H, ls);
      ctx.beginPath();
      ctx.moveTo(nx - lw / 2, y);
      ctx.lineTo(nx + lw / 2, y);
      ctx.stroke();
    }
  } else {
    const end = pos % 2 === 0 ? pos : pos - 1;
    for (let p = 6; p <= end; p += 2) {
      const y = ny(p, H, ls);
      ctx.beginPath();
      ctx.moveTo(nx - lw / 2, y);
      ctx.lineTo(nx + lw / 2, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Grid drawing ──────────────────────────────────────────────────────────────

/**
 * Draw the time grid: beat lines (12px intervals) and bar lines (48px intervals),
 * plus bar numbers above.
 * Ported from prototype paint() grid section (Pentagrama.dc.html lines 277–298).
 *
 * Vertical span: cy−ls×2.6 to cy+ls×2.6 (per step spec §c).
 */
function drawGrid(ctx: CanvasRenderingContext2D, W: number, cy: number, ls: number): void {
  const sr = W - 20;
  const gridT = cy - ls * 2.6;
  const gridB = cy + ls * 2.6;

  // Beat lines (12px intervals, opacity 0.028) — skip positions that land on bar lines
  ctx.strokeStyle = 'rgba(255,255,255,0.028)';
  ctx.lineWidth = 1;
  for (let x = SL + 12; x < sr; x += 12) {
    if ((x - SL) % PX !== 0) {
      ctx.beginPath();
      ctx.moveTo(x, gridT);
      ctx.lineTo(x, gridB);
      ctx.stroke();
    }
  }

  // Bar lines (48px intervals): first bar at SL = 0.22 opacity, others 0.08
  // Ported from prototype Pentagrama.dc.html lines 286–290.
  for (let x = SL; x <= sr; x += PX) {
    ctx.strokeStyle = x === SL ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = x === SL ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x, gridT);
    ctx.lineTo(x, gridB);
    ctx.stroke();
  }

  // Bar numbers: IBM Plex Mono 500 8.5px, opacity 0.15
  // Ported from prototype Pentagrama.dc.html lines 292–298.
  ctx.font = '500 8.5px "IBM Plex Mono", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  for (let bar = 0; SL + bar * PX < sr; bar++) {
    ctx.fillText(String(bar + 1), SL + bar * PX + 3, cy - ls * 2 - 14);
  }
}

// ── Staff lines ───────────────────────────────────────────────────────────────

/**
 * Draw the 5-line treble staff (E4, G4, B4, D5, F5).
 * Ported from prototype paint() staff section (Pentagrama.dc.html lines 301–306).
 *
 * Lines at cy−n×ls for n=−2..+2.
 * Left edge: SL−14; right edge: W−20.
 * Center line (n=0) at opacity 0.32; others at 0.18.
 */
function drawStaffLines(ctx: CanvasRenderingContext2D, cy: number, ls: number, W: number): void {
  const sr = W - 20;
  for (let li = -2; li <= 2; li++) {
    const ly = cy - li * ls;
    ctx.strokeStyle = li === 0 ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SL - 14, ly);
    ctx.lineTo(sr, ly);
    ctx.stroke();
  }
}

// ── Exhaustiveness helper ─────────────────────────────────────────────────────

/**
 * TypeScript exhaustiveness check — called in unreachable branches to ensure
 * that every `ProgressionSlot` variant is handled. If the union gains a new
 * member and this `else` branch becomes reachable, TypeScript will error
 * because `x` will no longer be assignable to `never`.
 *
 * Phase 01 step 01.5 (note-placement) — satisfies A-01-31.
 */
function assertNeverSlot(x: never): never {
  throw new Error(`Unhandled ProgressionSlot variant: ${JSON.stringify(x)}`);
}

// ── Chord slot rendering ──────────────────────────────────────────────────────

/**
 * Render a chord slot: 3 sustain bars (attack→decay gradient) + gemstone onset circles.
 * Ported from prototype pChord (Pentagrama.dc.html lines 421–465).
 *
 * Step 10.13: added `isAct` parameter for onset pulse and sustain-bar opacity.
 * When isAct=true:
 *   - onset circle radius pulses: OR × (1 + 0.16×sin(ts/700×2π))
 *   - onset glow: shadowColor=col, shadowBlur=7+5×|sin(ts/700×2π)|
 *   - sustain bar base opacity: 0.88 (vs 0.72 for inactive)
 *
 * bx = x + (sh ? 22 : 6) — note: x here is the slot's canvas left edge (already includes SL).
 * Per prototype, the sustain bar and onset circle use the same bx.
 *
 * octave: sourced from HarmonyState.octave (Chord type has no octave field).
 * ADR 0015 D4 / inventory OQ-R2: chordVoicing(rootPc, qual, octave) → note strings → m2p.
 */
function pChord(
  ctx: CanvasRenderingContext2D,
  slot: Chord,
  x: number, // slot left edge (canvas coords, includes SL)
  w: number, // slot pixel width
  H: number,
  ls: number,
  octave: number,
  isAct: boolean,
  ts: DOMHighResTimeStamp
): void {
  // Active pulse: radius scale and glow (prototype pChord lines 422–423, 444–448).
  const pulse = isAct ? 1 + 0.16 * Math.sin((ts / 700) * Math.PI * 2) : 1;
  const voices = chordVoicing(slot.rootPc, slot.qual as Quality, octave);

  voices.forEach((noteName, vi) => {
    const midi = noteNameToMidi(noteName);
    const { pos, sh } = m2p(midi);
    const yn = ny(pos, H, ls);
    const col = VC[vi] ?? '#8aa0ff';

    // Sustain bar: attack→decay gradient, rounded rect
    // Ported from prototype pChord lines 433–440.
    // Active: base opacity 0.88; inactive: 0.72.
    const bx = x + (sh ? 22 : 6);
    const bw = Math.max(4, w - (sh ? 26 : 10));

    // Ledger lines drawn behind bar
    ldg(ctx, pos, bx + OR, H, ls);

    const a = isAct ? 0.88 : 0.72;
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, col + ha(a));
    g.addColorStop(0.45, col + ha(a * 0.625)); // ≈ 0.55 active / 0.45 inactive
    g.addColorStop(1, col + ha(a * 0.205)); // ≈ 0.18 active / 0.15 inactive
    ctx.fillStyle = g;
    rr(ctx, bx, yn - BH / 2, bw, BH, 2);
    ctx.fill();

    // Gemstone onset circle: dark fill + colored stroke + active glow.
    // Ported from prototype pChord lines 443–454.
    ctx.save();
    if (isAct) {
      ctx.shadowColor = col;
      ctx.shadowBlur = 7 + 5 * Math.abs(Math.sin((ts / 700) * Math.PI * 2));
    }
    ctx.fillStyle = 'rgba(8,10,16,0.95)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(bx + OR, yn, OR * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Sharp accidental
    // Ported from prototype pChord lines 456–464.
    if (sh) {
      ctx.save();
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.82;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♯', x + 11, yn);
      ctx.restore();
    }
  });
}

// ── Arpeggio slot rendering ───────────────────────────────────────────────────

/**
 * Render an arpeggio slot: the voices spread ONCE across the whole slot, in
 * sequence, each with its own sustain bar + gemstone onset circle + connector.
 *
 * REVISED (ADR 0016, 2026-06-15): per-SLOT spread — restores the prototype's
 * original behavior (Pentagrama.dc.html lines 468–476: voices spread once across
 * the entire slot). The earlier per-CYCLE stagger (ADR 0015 D5) repeated the
 * arpeggio group once per cycle to mirror the old per-cycle re-attack audio. ADR
 * 0016 made the arpeggio play exactly ONCE across its whole span (`.slow(bars)`),
 * so the visual must match: each note sounds once, spread across the slot's time —
 * not repeated per cycle. The audio onsets land at vi/n of the span (verified:
 * a 1-cycle arp = c@0→⅓, e@⅓→⅔, g@⅔→1), so each voice gets the [vi/n, (vi+1)/n]
 * horizontal portion of the slot.
 *
 * Step 10.13 carry-over: `isAct` + `ts` drive the onset pulse and glow.
 * octave: sourced from HarmonyState.octave (Chord type has no octave field).
 */
function pArp(
  ctx: CanvasRenderingContext2D,
  slot: Chord,
  x: number, // slot left edge (canvas coords, includes SL)
  w: number, // slot pixel width
  H: number,
  ls: number,
  octave: number,
  isAct: boolean,
  ts: DOMHighResTimeStamp
): void {
  const pulse = isAct ? 1 + 0.16 * Math.sin((ts / 700) * Math.PI * 2) : 1;
  const voices = chordVoicing(slot.rootPc, slot.qual as Quality, octave);
  const n = voices.length;
  if (n === 0) return;

  // Each voice occupies the [vi/n, (vi+1)/n] horizontal portion of the slot,
  // mirroring where it actually sounds (audio onset at vi/n of the span).
  const seg = w / n;
  const pts = voices.map((noteName, vi) => {
    const midi = noteNameToMidi(noteName);
    const { pos, sh } = m2p(midi);
    return { x0: x + vi * seg + 4, segW: seg, cy: ny(pos, H, ls), pos, sh, vi };
  });

  // Sustain bars: one per note, sequential — shows each note sounding once across
  // its portion of the slot's time (attack→decay gradient, same style as pChord).
  pts.forEach((p) => {
    const col = VC[p.vi] ?? '#8aa0ff';
    ldg(ctx, p.pos, p.x0 + OR, H, ls);
    const a = isAct ? 0.88 : 0.72;
    const bw = Math.max(4, p.segW - 8);
    const g = ctx.createLinearGradient(p.x0, 0, p.x0 + bw, 0);
    g.addColorStop(0, col + ha(a));
    g.addColorStop(0.45, col + ha(a * 0.625));
    g.addColorStop(1, col + ha(a * 0.205));
    ctx.fillStyle = g;
    rr(ctx, p.x0, p.cy - BH / 2, bw, BH, 2);
    ctx.fill();
  });

  // Connector line between the onset circles (sequence cue).
  // Ported from prototype pArp lines 479–484 (per-slot positions).
  if (pts.length >= 2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const first = pts[0];
    if (first !== undefined) {
      ctx.moveTo(first.x0 + OR, first.cy);
      for (let i = 1; i < pts.length; i++) {
        const pt = pts[i];
        if (pt !== undefined) ctx.lineTo(pt.x0 + OR, pt.cy);
      }
    }
    ctx.stroke();
  }

  // Onset circles + accidentals.
  // Ported from prototype pArp lines 486–496; isAct pulse + glow from step 10.13.
  pts.forEach((p) => {
    const col = VC[p.vi] ?? '#8aa0ff';
    ctx.save();
    if (isAct) {
      ctx.shadowColor = col;
      ctx.shadowBlur = 7 + 5 * Math.abs(Math.sin((ts / 700) * Math.PI * 2));
    }
    ctx.fillStyle = 'rgba(8,10,16,0.95)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(p.x0 + OR, p.cy, OR * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (p.sh) {
      ctx.save();
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.82;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♯', p.x0 - 5, p.cy);
      ctx.restore();
    }
  });
}

// ── Rest slot rendering ───────────────────────────────────────────────────────

/**
 * Render a rest slot: grey rounded-rect + center tick.
 * Ported verbatim from prototype pRest (Pentagrama.dc.html lines 500–506).
 */
function pRest(
  ctx: CanvasRenderingContext2D,
  x: number, // slot left edge (canvas coords, includes SL)
  w: number,
  cy: number
): void {
  ctx.fillStyle = 'rgba(140,145,162,0.38)';
  rr(ctx, x + 5, cy - BH / 2, w - 10, BH, 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, cy - 11);
  ctx.lineTo(x + w / 2, cy + 11);
  ctx.stroke();
}

/**
 * Render a note-head for a `NoteSlot` on the staff.
 *
 * The note name is derived from `slot.rootPc` and `slot.octaveOffset` at render time,
 * matching the codegen formula exactly:
 *   `NOTE_NAMES[slot.rootPc] + (octave + slot.octaveOffset)`
 *
 * Renders:
 *   - Accent-colored sustain bar (horizontal backdrop, same dims as pRest but in #8aa0ff)
 *   - Ledger lines when the note falls outside the 5-line staff (|pos| > 4)
 *   - A filled note-head circle at the correct staff position, in accent color (#8aa0ff)
 *   - Sharp accidental label ('♯') when the note is a sharp
 *   - Active pulse on the note-head (same pattern as pChord onset circles)
 *
 * Phase 01 step 01.5 (note-placement) — replaces pNotePlaceholder from step 01.2.
 *
 * Prototype parity: pNote is a new feature; no prototype analog. Note-head position
 * uses noteNameToMidi + m2p + ny helpers already ported from prototype lines 160–168.
 */
function pNote(
  ctx: CanvasRenderingContext2D,
  slot: NoteSlot,
  x: number, // slot left edge (canvas coords, includes SL)
  w: number, // slot pixel width
  H: number,
  ls: number,
  octave: number,
  isAct: boolean,
  ts: DOMHighResTimeStamp
): void {
  const accentCol = '#8aa0ff';

  // Derive note name — same formula as codegen (strudel.ts NoteSlot branch):
  // NOTE_NAMES[rootPc] + (octave + octaveOffset)
  const absOctave = octave + slot.octaveOffset;
  const noteName = (NOTE_NAMES[slot.rootPc] ?? 'C') + String(absOctave);

  // Convert note name → MIDI → staff position
  const midi = noteNameToMidi(noteName);
  const { pos, sh } = m2p(midi);

  // Canvas y of the note-head
  const yn = ny(pos, H, ls);

  // Note-head x — centered in the slot
  const nx = x + w / 2;

  // Accent-color sustain bar (horizontal backdrop across the slot).
  // Same dimensions as pRest but using the accent color with appropriate opacity.
  const barAlpha = isAct ? 0.55 : 0.3;
  ctx.fillStyle = accentCol + ha(barAlpha);
  rr(ctx, x + 5, yn - BH / 2, w - 10, BH, 2);
  ctx.fill();

  // Ledger lines above/below the 5-line staff (ldg is a no-op when |pos| <= 4).
  ldg(ctx, pos, nx, H, ls);

  // Active pulse: radius scale and glow (matches pChord onset circle pattern).
  const pulse = isAct ? 1 + 0.16 * Math.sin((ts / 700) * Math.PI * 2) : 1;

  // Note-head circle: filled accent color + dark outline + active glow.
  ctx.save();
  if (isAct) {
    ctx.shadowColor = accentCol;
    ctx.shadowBlur = 7 + 5 * Math.abs(Math.sin((ts / 700) * Math.PI * 2));
  }
  ctx.fillStyle = accentCol;
  ctx.strokeStyle = 'rgba(8,10,16,0.70)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(nx, yn, OR * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Sharp accidental label ('♯') when the note is a sharp.
  if (sh) {
    ctx.save();
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = accentCol;
    ctx.globalAlpha = 0.82;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♯', nx - OR - 6, yn);
    ctx.restore();
  }
}

// ── Module-level singleton state ─────────────────────────────────────────────

let _canvas: HTMLCanvasElement | null = null;

// ── Pitch-offset DOM overlay (step 01.5) ─────────────────────────────────────
//
// A small `+`/`-` button overlay that appears when a NoteSlot is hovered.
// Implemented as an absolutely-positioned <div> mounted inside stageEl's parent.
// This is a DOM element (not a PIXI or Canvas 2D primitive), consistent with the
// spec requirement ("DOM overlay, not a PIXI object").
//
// Lifecycle:
//   initPentagrama   → creates _offsetOverlay and appends to stageEl (relative container)
//   destroyPentagrama → removes _offsetOverlay from DOM
//   paint()          → positions + shows/hides per frame based on _hoverSlotIdx + isNoteSlot
//
// The overlay intercepts pointer events; the canvas's pointer-events CSS is set to
// 'auto' only when Pentagrama is visible, so the overlay only receives events then.
let _offsetOverlay: HTMLDivElement | null = null;
/** Index of the NoteSlot whose offset control is currently shown (−1 = hidden). */
let _offsetOverlaySlotIdx = -1;
let _ctx: CanvasRenderingContext2D | null = null;
let _dpr = 1;
let _W = 0;
let _H = 0;
let _rafHandle = 0;
let _observer: ResizeObserver | null = null;

// ── Module-level interaction state (step 10.14, ADR 0015 D6, ADR 0014 D3/D4) ─
//
// Mirrors ADR 0014 D3/D4 semantics, now in Canvas 2D. Selection guard
// (ADR 0014 Consequence 3): at start of each paint, if
// _selectedSlotIdx !== null && _selectedSlotIdx >= progression.length → reset to null.
//
// Prototype parity: prototype uses this.state.selectedSlot / this.drag object
// (Pentagrama.dc.html state at lines 528–558, 560–575, 578–590). Here these are
// module-level variables — same semantics, different housing.

// _selectedSlotIdx is now managed via selectedSlotIdxStore (ADR 0018 D5, step 02.4).
// All reads use `get(selectedSlotIdxStore)`; all writes use `selectedSlotIdxStore.set(n)`.
let _hoverSlotIdx: number | null = null;

// Resize state
let _resizeActive = false;
let _resizeStartPx = 0;
let _resizeStartBars = 1;
let _resizePreviewBars = 1;

// Move state
let _moveActive = false;
let _moveFromIdx = -1;
let _moveDragPx = 0;
let _moveInsertIdx = -1;

// Pointer-down state (for move-arm threshold)
let _pointerDownPx = 0;
let _pointerDownOnSelected = false;

// Slot bounds — recomputed at the start of each paint() from current progression.
// computeSlotBounds(progression, PX) returns bounds with x=0 at the first slot;
// the SL offset is applied before calling hitTest* functions (ADR 0015 D6, OQ-R3).
let _slotBounds: SlotBounds[] = [];

// ── Geometry helpers (ADR 0015 D3) ──────────────────────────────────────────

/**
 * Update canvas backing-store dimensions and CSS size for the given logical
 * pixel dimensions. Called by ResizeObserver and on first mount.
 *
 * DPR cap: Math.min(devicePixelRatio, 2) per ADR 0015 D3 / D7.
 */
function setup(w: number, h: number): void {
  _dpr = Math.min(devicePixelRatio, 2);
  _W = w;
  _H = h;
  if (_canvas === null) return;
  _canvas.width = Math.round(w * _dpr);
  _canvas.height = Math.round(h * _dpr);
  _canvas.style.width = `${w}px`;
  _canvas.style.height = `${h}px`;
}

// ── rAF paint loop ────────────────────────────────────────────────────────────

/**
 * Full paint callback (steps 10.12–10.14).
 * Reads SessionState from the store once per frame; derives all geometry.
 * Step 10.13 adds: ambient breathe, actIdx, active-slot spotlight, isAct pulse
 * on pChord/pArp, and shared-anchor playhead.
 * Step 10.14 adds: slot interaction rendering — hover, selection chrome,
 * move ghost, resize preview. Also recomputes _slotBounds each frame and
 * applies the selection guard (ADR 0014 Consequence 3).
 */
function paint(ts: DOMHighResTimeStamp): void {
  if (_ctx === null) return;
  const W = _W;
  const H = _H;
  if (W < 10 || H < 10) return;

  // (a) State read pattern (ADR 0015 D7 / step spec §a)
  const state = get(sessionStore);
  const { chordMode, harmony } = state;
  const { progression, root, mode, octave } = harmony;
  // diatonicLookup once per frame for badge colors and spotlight color (step spec §a)
  const dmap = diatonicLookup(root, mode as Mode);

  const ctx = _ctx;

  // ── Recompute slot bounds + selection guard (step 10.14 §a) ──────────────
  // computeSlotBounds(progression, PX): x starts at 0 (staff-relative, no SL).
  // Hit-tests subtract SL from e.offsetX before calling these (OQ-R3, ADR 0015 D6).
  _slotBounds = computeSlotBounds(progression, PX);

  // ADR 0014 Consequence 3: if the selected slot index is now out of range
  // (e.g., the progression shrank due to clearChordAt), reset selection.
  const _selectedSlotIdx = get(selectedSlotIdxStore);
  if (_selectedSlotIdx !== null && _selectedSlotIdx >= progression.length) {
    selectedSlotIdxStore.set(null);
  }

  // Responsive geometry (ADR 0015 D3)
  const ls = Math.max(24, Math.min(88, H / 6));
  // cy: staff center, shifted upward relative to H/2 (per ADR 0015 D3 / prototype line 248)
  const cy = H / 2 - ls * 0.75;
  const sr = W - 20; // right boundary

  ctx.save();
  ctx.scale(_dpr, _dpr);

  // Clear to transparent
  ctx.clearRect(0, 0, W, H);

  // ── (a) Ambient background breathe ───────────────────────────────────────
  // Ported from prototype paint() breathe section (Pentagrama.dc.html lines 255–260).
  // Drawn FIRST after clearRect per step spec §a.
  // b oscillates 0→1 with period ≈ 3.4 s; radial gradient pulses softly.
  {
    const b = 0.5 + 0.5 * Math.sin((ts / 3400) * Math.PI * 2);
    const bg = ctx.createRadialGradient(W * 0.6, H * 0.4, 0, W * 0.6, H * 0.4, W * 0.7);
    bg.addColorStop(0, `rgba(138,160,255,${(0.018 + 0.008 * b).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(138,160,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── (b+c) Compute active slot index + spotlight ───────────────────────────
  // actIdx: shared-anchor variant (prototype actIdx lines 188–199, divergence documented above).
  const ai = actIdx(state);

  // ── (c) Active-slot spotlight ─────────────────────────────────────────────
  // Ported from prototype paint() spotlight section (Pentagrama.dc.html lines 262–274).
  // Drawn after breathe, before grid + staff.
  if (ai >= 0) {
    const activeSlot = progression[ai];
    if (activeSlot !== undefined) {
      // Derive spotlight color from tonal function (or accent fallback).
      // NoteSlot and RestSlot both use the accent color default (#8aa0ff).
      let spotCol = '#8aa0ff';
      if (!('isRest' in activeSlot && activeSlot.isRest) && !isNoteSlot(activeSlot)) {
        const chord = activeSlot as Chord;
        const key = `${chord.rootPc}:${chord.qual}`;
        const dfn = dmap[key];
        if (dfn !== undefined && dfn.func.cls !== '') {
          spotCol = FC[dfn.func.cls] ?? '#8aa0ff';
        }
      }
      const sx = slotX(ai, progression);
      const sw = slotW(activeSlot);
      const p = 0.5 + 0.5 * Math.sin((ts / 820) * Math.PI * 2);
      const a = ha(0.07 + 0.04 * p);
      const sg = ctx.createLinearGradient(sx - sw * 0.4, 0, sx + sw * 1.4, 0);
      sg.addColorStop(0, 'transparent');
      sg.addColorStop(0.25, spotCol + a);
      sg.addColorStop(0.75, spotCol + a);
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── (d) Time grid ─────────────────────────────────────────────────────────
  // Ported from prototype paint() grid section (lines 277–298)
  drawGrid(ctx, W, cy, ls);

  // ── (e) Staff lines ───────────────────────────────────────────────────────
  // Ported from prototype paint() staff section (lines 301–306)
  drawStaffLines(ctx, cy, ls, W);

  // ── Slots ─────────────────────────────────────────────────────────────────
  progression.forEach((slot, idx) => {
    const x = slotX(idx, progression);
    // When a resize is in progress on this slot, use the preview width.
    // The store is NOT written until onUp — local preview only.
    const rawW = slotW(slot);
    const w = _resizeActive && _selectedSlotIdx === idx ? _resizePreviewBars * PX : rawW;
    const isAct = ai === idx;
    const isSel = _selectedSlotIdx === idx;
    const isHov = _hoverSlotIdx === idx && !isSel;

    // Clamp slots that would overflow the right boundary
    if (x > sr) return;

    // ── Hover rect (step 10.14 §b — port of prototype paint() lines 315–318) ─
    // Drawn BEFORE the slot content so it sits behind the slot rendering.
    // Prototype: `ctx.fillStyle='rgba(255,255,255,0.020)'; ctx.fillRect(x, cy-ls*2.5, w, ls*5)`
    if (isHov) {
      ctx.fillStyle = 'rgba(255,255,255,0.020)';
      ctx.fillRect(x, cy - ls * 2.5, w, ls * 5);
    }

    if (isNoteSlot(slot)) {
      // NoteSlot — full pNote paint (step 01.5).
      pNote(ctx, slot, x, w, H, ls, octave, isAct, ts);

      // Hover label: note name above slot (parallel to chord hover label).
      if (isHov) {
        const absOctave = octave + slot.octaveOffset;
        const noteLabel = (NOTE_NAMES[slot.rootPc] ?? 'C') + String(absOctave);
        ctx.save();
        ctx.font = '500 9.5px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#8aa0ff';
        ctx.globalAlpha = 0.65;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`♩ ${noteLabel}`, x + w / 2, cy - ls * 2 - 5);
        ctx.restore();
      }
    } else if ('isRest' in slot && slot.isRest) {
      // Rest slot
      // Ported from prototype pRest (lines 500–506)
      pRest(ctx, x, w, cy);
    } else if ('rootPc' in slot && 'qual' in slot) {
      // Chord slot — exhaustive narrowing via structural properties.
      // `assertNeverSlot` (step 01.5) is the compile-time guard: if ProgressionSlot
      // gains a new member that does not have rootPc+qual, TypeScript will widen `slot`
      // in this branch and fail the Chord assignment below; if it does have rootPc+qual
      // it would reach this branch, and the caller must add a new guard above it.
      const chord: Chord = slot;

      if (chordMode === 'chord') {
        // Chord mode: sustain bars + gemstone onset circles + isAct pulse (step 10.13).
        // Ported from prototype pChord (lines 421–465).
        // octave sourced from harmony.octave (Chord has no octave field; HarmonyState.octave is
        // the global voicing octave per ADR 0015 D4 / inventory OQ-R2).
        pChord(ctx, chord, x, w, H, ls, octave, isAct, ts);
      } else {
        // Arpeggio mode: per-slot spread — each note sounds once across its portion of
        // the slot (ADR 0016 revision; restores prototype pArp lines 468–476, supersedes
        // the ADR 0015 D5 per-cycle stagger) + isAct pulse (step 10.13).
        pArp(ctx, chord, x, w, H, ls, octave, isAct, ts);
      }

      // ── Hover label (step 10.14 §b — port of prototype paint() lines 320–329) ─
      // Chord label above slot in tonal-function color, 65% opacity.
      // Prototype: slot.label (computed); here we derive via chordLabel().
      if (isHov) {
        ctx.save();
        ctx.font = '500 9.5px "IBM Plex Mono", monospace';
        const key = `${chord.rootPc}:${chord.qual}`;
        const dfn = dmap[key];
        ctx.fillStyle =
          dfn !== undefined && dfn.func.cls !== '' ? (FC[dfn.func.cls] ?? '#9097a6') : '#9097a6';
        ctx.globalAlpha = 0.65;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(chordLabel(chord.rootPc, chord.qual as Quality), x + w / 2, cy - ls * 2 - 5);
        ctx.restore();
      }

      // Tonal-function badges (T / SD / D)
      // Ported from prototype paint() badge section (lines 336–344).
      // Badge drawn below the staff for diatonic chords only.
      // Non-diatonic chords miss the dmap lookup (undefined) → no badge.
      // func.cls is '' for non-diatonic (TonalFunctionInfo: 'tonic'|'subdom'|'dom'|'').
      const key = `${chord.rootPc}:${chord.qual}`;
      const dfn = dmap[key];
      if (dfn !== undefined && dfn.func.cls !== '') {
        const lblMap: Record<string, string> = {
          tonic: 'T',
          subdom: 'SD',
          dom: 'D',
        };
        const lbl = lblMap[dfn.func.cls];
        const col = FC[dfn.func.cls] ?? '#8aa0ff';
        if (lbl !== undefined) {
          ctx.save();
          ctx.font = '600 8px "IBM Plex Mono", monospace';
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.42;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(lbl, x + 5, cy + ls * 2 + 5);
          ctx.restore();
        }
      }

      // ── Selection chrome (step 10.14 §b — port of prototype isSel block lines 346–372) ─
      if (isSel) {
        // White 1.5px border rect.
        // Prototype: `ctx.strokeRect(x + 0.75, cy - ls*2 + 0.75, w - 1.5, ls*4 - 1.5)`
        ctx.strokeStyle = 'rgba(255,255,255,0.62)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(x + 0.75, cy - ls * 2 + 0.75, w - 1.5, ls * 4 - 1.5);

        // ✕ circle button (prototype lines 353–358).
        // bx = x+w-10, by = cy-ls*2-11
        const bx = x + w - 10;
        const by = cy - ls * 2 - 11;
        ctx.fillStyle = 'rgba(255,255,255,0.80)';
        ctx.beginPath();
        ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0b12';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', bx, by + 0.5);

        // Resize grip: 3px white-ish rect at right edge (prototype lines 361–362).
        ctx.fillStyle = 'rgba(255,255,255,0.36)';
        ctx.fillRect(x + w - 4, cy - ls * 2, 3, ls * 4);

        // Label: chord name + tonal-function + cycle count (prototype lines 364–371).
        // Prototype: `slot.label + (slot.func ? ' · ' + fs[slot.func] : '')`
        // Here we derive slot.label from chordLabel() and fnLabel from func.cls.
        {
          const fnLabels: Record<string, string> = { tonic: 'T', subdom: 'SD', dom: 'D' };
          const fnLabel =
            dfn !== undefined && dfn.func.cls !== '' ? (fnLabels[dfn.func.cls] ?? '') : '';
          const bars = slot.bars ?? 1;
          const barCount = bars === 1 ? '1 ciclo' : `${bars} ciclos`;
          const labelStr =
            chordLabel(chord.rootPc, chord.qual as Quality) +
            (fnLabel ? ' · ' + fnLabel : '') +
            ' · ' +
            barCount;
          const labelCol =
            dfn !== undefined && dfn.func.cls !== '' ? (FC[dfn.func.cls] ?? '#eaedf4') : '#eaedf4';
          ctx.save();
          ctx.font = '500 10px "IBM Plex Mono", monospace';
          ctx.fillStyle = labelCol;
          ctx.globalAlpha = 0.84;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(labelStr, x + 4, cy - ls * 2 - 3);
          ctx.restore();
        }
      }
    } else {
      // Unreachable — all ProgressionSlot variants handled above.
      // assertNeverSlot enforces compile-time exhaustiveness (step 01.5, A-01-31):
      // if ProgressionSlot gains a new member that is neither NoteSlot, RestSlot,
      // nor a Chord-shaped object, TypeScript will error here.
      assertNeverSlot(slot as never);
    }

    // ── Rest/Note slot selection chrome ──────────────────────────────────────
    // Selection chrome for rest and note slots (same visual structure as chord chrome).
    if (isSel && (('isRest' in slot && slot.isRest) || isNoteSlot(slot))) {
      ctx.strokeStyle = 'rgba(255,255,255,0.62)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(x + 0.75, cy - ls * 2 + 0.75, w - 1.5, ls * 4 - 1.5);

      const bx = x + w - 10;
      const by = cy - ls * 2 - 11;
      ctx.fillStyle = 'rgba(255,255,255,0.80)';
      ctx.beginPath();
      ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0b12';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×', bx, by + 0.5);

      ctx.fillStyle = 'rgba(255,255,255,0.36)';
      ctx.fillRect(x + w - 4, cy - ls * 2, 3, ls * 4);

      const bars = slot.bars ?? 1;
      const barCount = bars === 1 ? '1 ciclo' : `${bars} ciclos`;
      // Derive label: 'silencio' for RestSlot, note name for NoteSlot.
      const slotLabel = isNoteSlot(slot) ? `♩ · ${barCount}` : `silencio · ${barCount}`;
      ctx.save();
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#eaedf4';
      ctx.globalAlpha = 0.84;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(slotLabel, x + 4, cy - ls * 2 - 3);
      ctx.restore();
    }
  });

  // ── Pitch-offset overlay (step 01.5) ─────────────────────────────────────
  // Show the +/- offset control when a NoteSlot is hovered (not selected or dragging).
  // Position: horizontally centred on the slot, vertically just below the staff area.
  // Hide immediately when the hovered slot changes or is no longer a NoteSlot.
  if (_offsetOverlay !== null) {
    const hovNoteIdx =
      _hoverSlotIdx !== null &&
      !_resizeActive &&
      !_moveActive &&
      _hoverSlotIdx < progression.length &&
      isNoteSlot(progression[_hoverSlotIdx])
        ? _hoverSlotIdx
        : -1;

    if (hovNoteIdx >= 0) {
      const hovSlot = progression[hovNoteIdx];
      if (hovSlot !== undefined) {
        const ox = slotX(hovNoteIdx, progression);
        const ow = slotW(hovSlot);
        // Position below the staff (cy + ls*2 + margin) — overlay width estimated 56px
        const overlayW = 56;
        const overlayLeft = Math.round(ox + ow / 2 - overlayW / 2);
        const overlayTop = Math.round(cy + ls * 2 + 4);
        _offsetOverlay.style.left = `${overlayLeft}px`;
        _offsetOverlay.style.top = `${overlayTop}px`;
        _offsetOverlay.style.display = 'flex';
        _offsetOverlaySlotIdx = hovNoteIdx;
      }
    } else {
      _offsetOverlay.style.display = 'none';
      _offsetOverlaySlotIdx = -1;
    }
  }

  // ── Move ghost + insertion indicator (step 10.14 §b) ─────────────────────
  // Port of prototype paint() drag.mode==='moving' block (lines 375–394).
  // gx = _moveDragPx - w/2 (centre the ghost on the drag position).
  // Insertion indicator uses nearestInsertionIndex to find the boundary line x.
  if (_moveActive && _moveFromIdx >= 0 && _moveFromIdx < progression.length) {
    const moveSlot = progression[_moveFromIdx];
    if (moveSlot !== undefined) {
      const w = slotW(moveSlot);
      const gx = _moveDragPx - w / 2;

      // Dashed outline ghost (prototype lines 380–383):
      // `ctx.strokeStyle='rgba(138,160,255,0.52)'; ctx.setLineDash([4,4]); strokeRect(...)`
      ctx.strokeStyle = 'rgba(138,160,255,0.52)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(gx + 0.75, cy - ls * 2 + 0.75, w - 1.5, ls * 4 - 1.5);
      ctx.setLineDash([]);

      // Glowing white insertion indicator at nearest boundary (prototype lines 384–393).
      // nearestInsertionIndex takes staff-relative x (no SL), same as computeSlotBounds x=0.
      const ins =
        _moveInsertIdx >= 0 ? _moveInsertIdx : nearestInsertionIndex(_moveDragPx - SL, _slotBounds);
      // Boundary x: if ins >= bounds.length → after last slot; else at bounds[ins].x
      let lx: number;
      if (ins >= _slotBounds.length) {
        const last = _slotBounds[_slotBounds.length - 1];
        lx = last !== undefined ? SL + last.x + last.width : SL;
      } else {
        const b = _slotBounds[ins];
        lx = b !== undefined ? SL + b.x : SL;
      }
      ctx.save();
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, cy - ls * 2 - 6);
      ctx.lineTo(lx, cy + ls * 2 + 6);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── (f) Playhead ──────────────────────────────────────────────────────────
  // Ported from prototype phX (Pentagrama.dc.html lines 182–186) + paint() playhead
  // section (lines 396–410).
  //
  // INTENTIONAL DIVERGENCE from prototype: prototype uses `this.ps` (a local
  // timestamp). We use `getVisualPhaseAnchor()` — the shared anchor — so this
  // playhead stays in perfect sync with ProgressionStrip's cursor rAF tick.
  // Mirror of ProgressionStrip.svelte cursor math (lines 190–195):
  //   barMs = (60000 / bpm) * 4
  //   rawX = ((now - getVisualPhaseAnchor()) / barMs) * PX_PER_CYCLE
  //   cursorX = ((rawX % totalW) + totalW) % totalW
  // We add SL to rawX to place the playhead in staff coordinates.
  {
    const tw = totalW(progression);
    const bpm = state.bpm > 0 ? state.bpm : 120;
    const barMs = (60000 / bpm) * 4;
    if (tw > 0 && state.nowPlaying.source !== null) {
      const rawX = ((performance.now() - getVisualPhaseAnchor()) / barMs) * PX;
      const phx = SL + (((rawX % tw) + tw) % tw);
      const top = cy - ls * 2 - 18;

      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(phx, cy - ls * 2 - 16);
      ctx.lineTo(phx, cy + ls * 2 + 16);
      ctx.stroke();

      // Arrowhead triangle at top (prototype paint() lines 404–409)
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(phx - 5, top);
      ctx.lineTo(phx + 5, top);
      ctx.lineTo(phx, top + 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Right vignette — drawn last ───────────────────────────────────────────
  // Ported from prototype paint() vignette section (lines 413–415).
  const vg = ctx.createLinearGradient(W - 90, 0, W, 0);
  vg.addColorStop(0, 'rgba(7,8,9,0)');
  vg.addColorStop(1, 'rgba(7,8,9,0.52)');
  ctx.fillStyle = vg;
  ctx.fillRect(W - 90, 0, 90, H);

  ctx.restore();
}

function loop(ts: DOMHighResTimeStamp): void {
  paint(ts);
  _rafHandle = requestAnimationFrame(loop);
}

// ── Pointer event handlers (step 10.14 §c, ADR 0015 D6) ─────────────────────
//
// Registered on the Canvas 2D <canvas> element in initPentagrama.
// Removed in destroyPentagrama.
//
// All hit-tests pass (e.offsetX - SL) to the staff-hit.ts engine functions,
// which operate in staff-relative coordinates (x=0 at first slot left edge).
// A negative adjusted px (pointer in the clef gutter) safely returns null from
// all hit-test functions (OQ-R3 verdict, ADR 0015 D6).
//
// Prototype parity:
//   onDn  — port of prototype Pentagrama.dc.html lines 528–558 (onDn method).
//           prototype's hitSlot(px) → replaced by hitTestSlot(px-SL, _slotBounds).
//           prototype's slot.splice() → replaced by clearChordAt(idx) store action.
//   onMv  — port of prototype lines 560–575 (onMv method).
//           prototype's hitSlot(px) → replaced by hitTestSlot(px-SL, _slotBounds).
//           prototype's clamp formula → replaced by clampBars (same math).
//   onUp  — port of prototype lines 578–590 (onUp method).
//           prototype's splice + insertPos → replaced by reorderSlot(fromIdx, toIdx).
//
// Store actions called (same as ProgressionStrip — ADR 0014 D1, A-10-32):
//   clearChordAt(idx)     — delete slot; calls requeueLive().
//   setChordBars(idx, bars) — resize commit; internally clamps via clampBars().
//   reorderSlot(from, to) — move commit; calls requeueLive().
//
// NOTE: setChordBars already clamps internally via clampBars (session.ts line 897).
// We also apply clampBars before calling setChordBars for the resize preview
// (_resizePreviewBars) so the preview matches the committed value exactly.

function onDn(e: PointerEvent): void {
  if (_canvas === null) return;
  const state = get(sessionStore);
  const { harmony } = state;
  // Belt-and-suspenders guard: do nothing if staff is not visible (ADR 0015 D6).
  if (!(state.view === 'harmony' && harmony.subview === 'staff')) return;

  const px = e.offsetX;
  const py = e.offsetY;
  const progression = harmony.progression;

  // Recompute bounds at event time (progression may have changed since last paint).
  // _slotBounds was computed in the last paint(); reuse it — it is always current
  // because paint() runs on every rAF frame and updates _slotBounds first.

  // (1) ✕ hit-test: if a slot is selected and pointer is within 13px of ✕ centre.
  // ✕ centre = (x+w-10, cy-ls*2-11) in canvas coords (matches selection chrome).
  // Prototype: `Math.hypot(px-(sx+sw-10), py-(cy-ls*2-11)) < 13` (lines 537–539).
  const selIdx = get(selectedSlotIdxStore);
  if (selIdx !== null) {
    const selSlot = progression[selIdx];
    if (selSlot !== undefined) {
      // Derive geometry matching paint() — use _H for ls/cy.
      const ls = Math.max(24, Math.min(88, _H / 6));
      const cy = _H / 2 - ls * 0.75;
      const sx = slotX(selIdx, progression);
      const sw = _resizeActive ? _resizePreviewBars * PX : slotW(selSlot);
      const bx = sx + sw - 10;
      const by = cy - ls * 2 - 11;
      if (Math.hypot(px - bx, py - by) < 13) {
        clearChordAt(selIdx);
        selectedSlotIdxStore.set(null);
        _resizeActive = false;
        _moveActive = false;
        _pointerDownOnSelected = false;
        return;
      }

      // (2) Resize handle hit-test (right-edge zone, handle width = 14px).
      // hitTestResizeHandle takes staff-relative x (e.offsetX - SL).
      // Returns the slotIndex of the handle, or null.
      // Prototype: `if (px > sx + sw - 14 && px < sx + sw + 5)` (lines 541–544).
      const adjPx = px - SL;
      const resizeHit = hitTestResizeHandle(adjPx, _slotBounds, 14);
      if (resizeHit === selIdx) {
        _resizeActive = true;
        _resizeStartPx = px;
        _resizeStartBars = selSlot.bars ?? 1;
        _resizePreviewBars = _resizeStartBars;
        _pointerDownOnSelected = false;
        _moveActive = false;
        _canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
  }

  // (3) Body hit-test: which slot was clicked?
  // hitTestSlot takes staff-relative x (e.offsetX - SL). Returns slotIndex|null.
  // Prototype: `const hit = this.hitSlot(px)` where hitSlot includes the SL offset.
  // Here hitSlot was replaced by hitTestSlot(px-SL, bounds) (inventory OQ-R3).
  const adjPx = px - SL;
  const hit = hitTestSlot(adjPx, _slotBounds);
  if (hit !== null) {
    if (selIdx === hit) {
      // Already selected → arm for move (4px threshold in onMv).
      // Prototype: `if (selectedSlot === hit) { Object.assign(this.drag, {mode:'arm', ...})`
      _pointerDownPx = px;
      _pointerDownOnSelected = true;
      _moveFromIdx = hit;
      _moveActive = false;
      _canvas.setPointerCapture(e.pointerId);
    } else {
      // New slot → select it.
      selectedSlotIdxStore.set(hit);
      _pointerDownOnSelected = false;
      _resizeActive = false;
      _moveActive = false;
    }
  } else {
    // (4) Outside all slots → deselect.
    selectedSlotIdxStore.set(null);
    _resizeActive = false;
    _moveActive = false;
    _pointerDownOnSelected = false;
  }
}

function onMv(e: PointerEvent): void {
  const px = e.offsetX;
  const state = get(sessionStore);
  const { harmony } = state;

  if (!(state.view === 'harmony' && harmony.subview === 'staff')) return;

  if (_resizeActive) {
    // Update resize preview (no store write — committed in onUp).
    // Prototype: `const nd = Math.max(0.25, Math.min(8, Math.round((od + (px-sx)/PX)*4)/4))`
    // We use clampBars which applies the same 0.25-step / [0.25,8] clamp.
    _resizePreviewBars = clampBars(_resizeStartBars + (px - _resizeStartPx) / PX);
    return;
  }

  if (_pointerDownOnSelected && !_moveActive) {
    // Move arm: activate if pointer moved > 4px.
    // Prototype: `else if (mode==='arm' && Math.abs(px-sx) > 4) { this.drag.mode='moving' }`
    if (Math.abs(px - _pointerDownPx) > 4) {
      _moveActive = true;
      _moveDragPx = px;
      _moveInsertIdx = nearestInsertionIndex(px - SL, _slotBounds);
    }
    return;
  }

  if (_moveActive) {
    // Update move drag position and insertion index.
    // Prototype: `this.drag.cx = px; this.forceUpdate()`
    _moveDragPx = px;
    _moveInsertIdx = nearestInsertionIndex(px - SL, _slotBounds);
    return;
  }

  // Hover: update hover slot when not dragging.
  // Prototype: `const h = this.hitSlot(px); if (h !== this.state.hoverSlot) setState({hoverSlot:h})`
  const newHover = hitTestSlot(px - SL, _slotBounds);
  _hoverSlotIdx = newHover;
}

function onUp(e: PointerEvent): void {
  const state = get(sessionStore);
  const { harmony } = state;

  if (!(state.view === 'harmony' && harmony.subview === 'staff')) {
    _resizeActive = false;
    _moveActive = false;
    _pointerDownOnSelected = false;
    if (_canvas !== null) _canvas.releasePointerCapture(e.pointerId);
    return;
  }

  const resizeSelIdx = get(selectedSlotIdxStore);
  if (_resizeActive && resizeSelIdx !== null) {
    // Commit resize: write clamped bars to the store (setChordBars also clamps internally).
    // Prototype: modifies slot.duration directly; we use the store action.
    setChordBars(resizeSelIdx, _resizePreviewBars);
  }

  if (_moveActive && _moveFromIdx >= 0 && _moveInsertIdx >= 0) {
    // Commit move: reorder only if the insertion index differs from current position.
    // Prototype: `const fi = Math.max(0, ins > slot ? ins - 1 : ins)` then splice.
    // reorderSlot handles absolute-index semantics (ADR 0014 D5).
    // ADR 0014 D5: reorderSlot is a no-op if clampedFrom === clampedTo.
    if (_moveInsertIdx !== _moveFromIdx) {
      reorderSlot(_moveFromIdx, _moveInsertIdx);
    }
  }

  // Reset all drag state.
  _resizeActive = false;
  _resizeStartPx = 0;
  _resizeStartBars = 1;
  _resizePreviewBars = 1;
  _moveActive = false;
  _moveFromIdx = -1;
  _moveDragPx = 0;
  _moveInsertIdx = -1;
  _pointerDownPx = 0;
  _pointerDownOnSelected = false;

  if (_canvas !== null) _canvas.releasePointerCapture(e.pointerId);
}

// ── Public API (ADR 0015 D7) ─────────────────────────────────────────────────

/**
 * Initialise the Canvas 2D Pentagrama layer.
 *
 * Creates a <canvas> element, appends it to stageEl with the CSS properties
 * required by ADR 0015 D7 / inventory OQ-R6 (position:absolute; top:0; left:0;
 * z-index:1; display:none; pointer-events:none), starts the ResizeObserver
 * and the rAF loop.
 *
 * Must be called once from App.svelte onMount, after initStage.
 */
export function initPentagrama(stageEl: HTMLDivElement): void {
  _canvas = document.createElement('canvas');
  _canvas.style.cssText =
    'position:absolute;top:0;left:0;z-index:1;display:none;pointer-events:none;';

  _ctx = _canvas.getContext('2d');
  if (_ctx === null) {
    // 2D context unavailable — leave canvas in DOM so setPentagramaVisible works
    // (it will just never draw anything).
    stageEl.appendChild(_canvas);
    return;
  }

  stageEl.appendChild(_canvas);

  // ── Pitch-offset + timbre DOM overlay (step 01.5 / post-phase-01 fix 2026-06-26) ─
  // Absolute-positioned <div> containing:
  //   - +/- octave-offset buttons (step 01.5)
  //   - sound <select> — 16 SK_SOUNDS values + "—" (none) option
  //   - gain <input type="number"> (0.0–1.2)
  // Mounted inside stageEl (position:relative); z-index:2 places it above the canvas.
  // Initially hidden; paint() positions + shows/hides it each frame.
  {
    // 16 SK_SOUNDS values — mirrors SK_SOUNDS in src/agent/schema.ts.
    // Defined inline to avoid importing from src/agent/ (CLAUDE.md invariant: no
    // agent imports in render layer).
    const NOTE_SOUNDS = [
      'bd',
      'sd',
      'hh',
      'oh',
      'cp',
      'rim',
      'lt',
      'mt',
      'ht',
      'conga',
      'cajon',
      'wood',
      'shaker',
      'cb',
      'perc',
      'hand',
    ] as const;

    const ov = document.createElement('div');
    ov.id = 'pentagrama-note-offset';
    ov.style.cssText =
      'position:absolute;display:none;z-index:2;' +
      'background:rgba(10,11,18,0.85);border:1px solid rgba(138,160,255,0.45);' +
      'border-radius:6px;padding:1px 4px;' +
      'align-items:center;gap:3px;pointer-events:auto;user-select:none;';

    const minus = document.createElement('button');
    minus.textContent = '−';
    minus.style.cssText =
      'background:none;border:none;color:#8aa0ff;font-size:13px;line-height:1;' +
      'padding:2px 4px;cursor:pointer;border-radius:4px;';
    minus.title = 'Lower pitch by one octave';

    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.style.cssText =
      'background:none;border:none;color:#8aa0ff;font-size:13px;line-height:1;' +
      'padding:2px 4px;cursor:pointer;border-radius:4px;';
    plus.title = 'Raise pitch by one octave';

    // Sound <select> — "—" + 16 SK_SOUNDS.
    const soundSel = document.createElement('select');
    soundSel.style.cssText =
      'background:rgba(10,11,18,0.9);border:1px solid rgba(138,160,255,0.35);' +
      'color:#8aa0ff;font-size:11px;border-radius:4px;padding:1px 2px;' +
      'cursor:pointer;max-width:64px;';
    soundSel.title = 'Sound (.s)';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '—';
    soundSel.appendChild(noneOpt);
    for (const s of NOTE_SOUNDS) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      soundSel.appendChild(opt);
    }

    // Gain <input> — 0.0–1.2, step 0.1.
    const gainInput = document.createElement('input');
    gainInput.type = 'number';
    gainInput.min = '0';
    gainInput.max = '1.2';
    gainInput.step = '0.1';
    gainInput.placeholder = 'gain';
    gainInput.style.cssText =
      'background:rgba(10,11,18,0.9);border:1px solid rgba(138,160,255,0.35);' +
      'color:#8aa0ff;font-size:11px;border-radius:4px;padding:1px 3px;' +
      'width:46px;';
    gainInput.title = 'Gain (.gain) 0–1.2';

    minus.addEventListener('click', () => {
      if (_offsetOverlaySlotIdx < 0) return;
      const state = get(sessionStore);
      const slot = state.harmony.progression[_offsetOverlaySlotIdx];
      if (slot !== undefined && isNoteSlot(slot)) {
        setNoteOffset(_offsetOverlaySlotIdx, slot.octaveOffset - 1);
      }
    });

    plus.addEventListener('click', () => {
      if (_offsetOverlaySlotIdx < 0) return;
      const state = get(sessionStore);
      const slot = state.harmony.progression[_offsetOverlaySlotIdx];
      if (slot !== undefined && isNoteSlot(slot)) {
        setNoteOffset(_offsetOverlaySlotIdx, slot.octaveOffset + 1);
      }
    });

    soundSel.addEventListener('change', () => {
      if (_offsetOverlaySlotIdx < 0) return;
      const value = soundSel.value;
      setNoteAttrs(_offsetOverlaySlotIdx, { instrument: value !== '' ? value : undefined });
    });

    gainInput.addEventListener('change', () => {
      if (_offsetOverlaySlotIdx < 0) return;
      const value = parseFloat(gainInput.value);
      if (!isNaN(value)) {
        setNoteAttrs(_offsetOverlaySlotIdx, { gain: value });
      }
    });

    ov.appendChild(minus);
    ov.appendChild(plus);
    ov.appendChild(soundSel);
    ov.appendChild(gainInput);
    stageEl.appendChild(ov);

    _offsetOverlay = ov;
  }

  // Initial size based on current container dimensions.
  const rect = stageEl.getBoundingClientRect();
  setup(rect.width || stageEl.offsetWidth, rect.height || stageEl.offsetHeight);

  // ResizeObserver: re-call setup when stage container size changes (ADR 0015 D7).
  _observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry === undefined) return;
    const { width, height } = entry.contentRect;
    setup(width, height);
  });
  _observer.observe(stageEl);

  // Pointer event listeners (step 10.14 §c, ADR 0015 D6).
  // Direct listeners on the Canvas 2D element (not routed through App.svelte).
  // pointer-events:auto is set when visible (setPentagramaVisible); these listeners
  // receive events only when the canvas is visible and interactive.
  _canvas.addEventListener('pointerdown', onDn);
  _canvas.addEventListener('pointermove', onMv);
  _canvas.addEventListener('pointerup', onUp);

  // Start rAF loop.
  _rafHandle = requestAnimationFrame(loop);
}

/**
 * Clean up the Canvas 2D Pentagrama layer.
 *
 * Cancels the rAF loop, disconnects the ResizeObserver, removes the pointer
 * event listeners (step 10.14 §c), and removes the canvas from the DOM.
 * Called from App.svelte onDestroy.
 */
export function destroyPentagrama(): void {
  if (_rafHandle !== 0) {
    cancelAnimationFrame(_rafHandle);
    _rafHandle = 0;
  }
  if (_observer !== null) {
    _observer.disconnect();
    _observer = null;
  }
  if (_canvas !== null) {
    // Remove pointer event listeners (step 10.14 §c — symmetric with initPentagrama).
    _canvas.removeEventListener('pointerdown', onDn);
    _canvas.removeEventListener('pointermove', onMv);
    _canvas.removeEventListener('pointerup', onUp);
    _canvas.remove();
    _canvas = null;
  }
  _ctx = null;

  // Remove pitch-offset DOM overlay (step 01.5, symmetric with initPentagrama).
  if (_offsetOverlay !== null) {
    _offsetOverlay.remove();
    _offsetOverlay = null;
    _offsetOverlaySlotIdx = -1;
  }

  // Reset interaction state so a subsequent initPentagrama starts clean.
  selectedSlotIdxStore.set(null);
  _hoverSlotIdx = null;
  _resizeActive = false;
  _resizeStartPx = 0;
  _resizeStartBars = 1;
  _resizePreviewBars = 1;
  _moveActive = false;
  _moveFromIdx = -1;
  _moveDragPx = 0;
  _moveInsertIdx = -1;
  _pointerDownPx = 0;
  _pointerDownOnSelected = false;
  _slotBounds = [];
}

/**
 * Show or hide the Canvas 2D Pentagrama layer.
 *
 * When visible: display:block; pointer-events:auto — canvas paints and
 * receives pointer events (ADR 0015 D6 / inventory OQ-R6).
 * When hidden: display:none; pointer-events:none — belt-and-suspenders so
 * the canvas never intercepts Tonnetz or other-view pointers.
 *
 * Called from App.svelte store subscription on every state change.
 * Condition: state.view === 'harmony' && state.harmony.subview === 'staff'
 * (ADR 0015 D7; inventory OQ-R6).
 */
export function setPentagramaVisible(visible: boolean): void {
  if (_canvas === null) return;
  if (visible) {
    _canvas.style.display = 'block';
    _canvas.style.pointerEvents = 'auto';
  } else {
    _canvas.style.display = 'none';
    _canvas.style.pointerEvents = 'none';
    // Hide pitch-offset overlay when Pentagrama is not visible (step 01.5).
    if (_offsetOverlay !== null) {
      _offsetOverlay.style.display = 'none';
      _offsetOverlaySlotIdx = -1;
    }
  }
}
