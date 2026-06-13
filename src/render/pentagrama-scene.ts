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
// ADR 0015 decisions implemented across steps 10.11–10.13:
//   D3 — responsive staff geometry (LS, cy, SL, PX, DPR cap).
//   D4 — note-name → staff position via inline MIDI conversion + ported m2p.
//   D5 — arpeggio stagger: per-cycle (not per-slot), intentional divergence from prototype pArp.
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
//   phX:         lines 182–186 (playhead — DIVERGENCE: shared anchor not this.ps)
//   actIdx:      lines 188–199 (active-slot index — DIVERGENCE: shared anchor not this.ps)
//   paint vign:  lines 413–415 (right vignette)

import { get } from 'svelte/store';
import { sessionStore } from '../state/session.js';
import type { ProgressionSlot, Chord, SessionState } from '../state/session.js';
import type { Quality } from '../core/theory/chords.js';
import { chordVoicing } from '../core/theory/chords.js';
import { diatonicLookup } from '../core/theory/scales.js';
import type { Mode } from '../core/theory/scales.js';
import { getVisualPhaseAnchor } from '../state/phase-anchor.js';

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
 * Render an arpeggio slot: per-cycle staggered onset circles + connector.
 *
 * INTENTIONAL DIVERGENCE from prototype pArp (Pentagrama.dc.html lines 468–476):
 * The prototype uses a per-SLOT spread: `span = w - 24`, each voice at
 * `x + 12 + (vi / max(n-1, 2)) * span` — spread once across the entire slot.
 *
 * This implementation uses per-CYCLE stagger (ADR 0015 D5, corrected behavior):
 * For each cycle in 0..ceil(bars)-1:
 *   voice 0: x + cycleIdx * PX
 *   voice 1: x + cycleIdx * PX + PX/3  (≈16px)
 *   voice 2: x + cycleIdx * PX + 2*PX/3 (≈32px)
 *
 * Rationale: Strudel arp codegen = note("A B C") inside arrange([bars, code]).
 * A/B/C play in each cycle. A 2-bar slot plays the group twice — the per-cycle
 * stagger makes this rhythm visible (per phase-10-redesign.md lines 100–108 and
 * ADR 0015 D5). The PIXI staff scene (commit 0c3d595) set this precedent.
 *
 * Step 10.13: added `isAct` + `ts` parameters for onset pulse and glow.
 * When isAct=true: onset circles pulse (same formula as pChord) and glow.
 *
 * octave: sourced from HarmonyState.octave (Chord type has no octave field).
 */
function pArp(
  ctx: CanvasRenderingContext2D,
  slot: Chord,
  x: number, // slot left edge (canvas coords, includes SL)
  H: number,
  ls: number,
  octave: number,
  isAct: boolean,
  ts: DOMHighResTimeStamp
): void {
  // Active pulse: radius scale (prototype pArp lines 469–470, same formula as pChord).
  const pulse = isAct ? 1 + 0.16 * Math.sin((ts / 700) * Math.PI * 2) : 1;
  const bars = slot.bars ?? 1;
  const cycleCount = Math.ceil(bars);
  const voices = chordVoicing(slot.rootPc, slot.qual as Quality, octave);

  for (let cycleIdx = 0; cycleIdx < cycleCount; cycleIdx++) {
    const cycleStart = x + cycleIdx * PX;

    // Compute per-cycle onset x positions and y positions.
    // Per-cycle stagger: voice i at cycleStart + (i/3)*PX (ADR 0015 D5):
    //   voice 0: cycleStart + 0
    //   voice 1: cycleStart + PX/3  ≈ cycleStart + 16 px
    //   voice 2: cycleStart + 2*PX/3 ≈ cycleStart + 32 px
    const pts = voices.map((noteName, vi) => {
      const midi = noteNameToMidi(noteName);
      const { pos } = m2p(midi);
      return {
        cx: cycleStart + (vi / 3) * PX, // 0, PX/3, 2*PX/3
        cy: ny(pos, H, ls),
        pos,
      };
    });

    // Connector line between the three circles within this cycle
    // Ported from prototype pArp lines 479–484 (adapted for per-cycle positions).
    if (pts.length >= 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.26)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const first = pts[0];
      if (first !== undefined) {
        ctx.moveTo(first.cx, first.cy);
        for (let i = 1; i < pts.length; i++) {
          const pt = pts[i];
          if (pt !== undefined) ctx.lineTo(pt.cx, pt.cy);
        }
      }
      ctx.stroke();
    }

    // Draw onset circles and ledger lines.
    // Ported from prototype pArp lines 486–496.
    // Step 10.13: apply isAct pulse + glow (prototype pArp lines 489–491, 493).
    pts.forEach((p, vi) => {
      ldg(ctx, p.pos, p.cx, H, ls);
      const col = VC[vi] ?? '#8aa0ff';
      ctx.save();
      if (isAct) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 7 + 5 * Math.abs(Math.sin((ts / 700) * Math.PI * 2));
      }
      ctx.fillStyle = 'rgba(8,10,16,0.95)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, OR * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }
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

// ── Module-level singleton state ─────────────────────────────────────────────

let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;
let _dpr = 1;
let _W = 0;
let _H = 0;
let _rafHandle = 0;
let _observer: ResizeObserver | null = null;

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
 * Full paint callback (steps 10.12 + 10.13).
 * Reads SessionState from the store once per frame; derives all geometry.
 * Step 10.13 adds: ambient breathe, actIdx, active-slot spotlight, isAct pulse
 * on pChord/pArp, and shared-anchor playhead.
 * Step 10.14 will add pointer affordances (hover, selection chrome, move ghost).
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
      let spotCol = '#8aa0ff';
      if (!('isRest' in activeSlot && activeSlot.isRest)) {
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
    const w = slotW(slot);
    const isAct = ai === idx;

    // Clamp slots that would overflow the right boundary
    if (x > sr) return;

    if ('isRest' in slot && slot.isRest) {
      // Rest slot
      // Ported from prototype pRest (lines 500–506)
      pRest(ctx, x, w, cy);
    } else {
      // Chord slot — type guard
      const chord = slot as Chord;

      if (chordMode === 'chord') {
        // Chord mode: sustain bars + gemstone onset circles + isAct pulse (step 10.13).
        // Ported from prototype pChord (lines 421–465).
        // octave sourced from harmony.octave (Chord has no octave field; HarmonyState.octave is
        // the global voicing octave per ADR 0015 D4 / inventory OQ-R2).
        pChord(ctx, chord, x, w, H, ls, octave, isAct, ts);
      } else {
        // Arpeggio mode: per-cycle stagger (ADR 0015 D5 divergence) + isAct pulse (step 10.13).
        // Prototype pArp lines 468–476 used per-slot spread; we use per-cycle.
        pArp(ctx, chord, x, H, ls, octave, isAct, ts);
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
    }
  });

  // ── Hover label — deferred to step 10.14 ─────────────────────────────────
  // Pointer tracking required. Comment placeholder per step spec §i.
  // TODO step 10.14: draw hover label in slot's tonal-function color above slot.

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

  // Start rAF loop.
  _rafHandle = requestAnimationFrame(loop);
}

/**
 * Clean up the Canvas 2D Pentagrama layer.
 *
 * Cancels the rAF loop, disconnects the ResizeObserver, and removes the canvas
 * from the DOM. Called from App.svelte onDestroy.
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
    _canvas.remove();
    _canvas = null;
  }
  _ctx = null;
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
  }
}
