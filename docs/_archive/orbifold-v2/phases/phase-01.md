# Phase 01 — UX Quick-Wins

**Purpose:** Fix three UI-only regressions in the live app: hide harmony-only header selectors in Rhythm mode, reposition the floating drawer tabs so they no longer overlap the Transport footer, and replace the progression chips with an equal-segment timeline strip that preserves all existing chip interactions.
**Gate:** orbifold-v1 Phase 08 complete and Pilot-approved (app live at GitHub Pages URL, main branch clean, all 180+ tests passing, `tsc --noEmit` / `pnpm lint` / `pnpm build` all exit 0).
**Expected phase result:** In Rhythm mode, the key/clave/octave selectors are hidden from the header; the "Código Strudel" and "Composición" tab buttons are visually clear of the Transport footer; the footer shows the progression as a segmented timeline strip with per-chord gain drag and tap-to-preview preserved; Strudel output is byte-identical to `main` for identical input; all quality gates pass.

---

## Step 01.1 — Inventory

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, and the orbifold-v1 Phase 08 completion handoff. Then read, in full: `src/app/App.svelte`, `src/app/app.css`, `src/ui/Header.svelte`, `src/state/session.ts` (types and exports only — focus on `SessionState.view`, valid view values, and what drives the key selector), `src/ui/CodeDrawer.svelte`, `src/ui/CompositionDrawer.svelte`, and `src/ui/ProgressionChips.svelte`. Produce `docs/orbifold-v2/inventories/phase-01-inventory.md`. Do not write source code.

Implementation requirements:
- Confirm the exact store accessor for the active view (`$sessionStore.view`) and the exact string value for Rhythm mode (`'rhythm'`) and Harmony mode (`'harmony'`) from `src/state/session.ts`.
- Identify which controls inside `<div class="field">` in `Header.svelte` are harmony-specific (key / clave / octave selects) vs. always-relevant (transport/BPM are in Transport.svelte and are not affected). Confirm that wrapping the `.field` div in `{#if $sessionStore.view === 'harmony'}` is the correct and complete change.
- Confirm the exact CSS that positions `#codeTab` (in `CodeDrawer.svelte` and `app.css`) and `#compTab` (in `app.css`): `bottom`, `left`, and `transform` values. Confirm the approximate height and `margin` of the Transport footer (the `<footer class="glass">` in `Transport.svelte`) so a repositioned tab height can be computed.
- Confirm the prototype source for the ProgressionChips interactions (pointerdown/pointermove/pointerup gain drag and tap-to-preview in `ProgressionChips.svelte`): cite exact lines/functions. State that these interactions MUST be present in the replacement component.
- Confirm that `src/core/codegen/strudel.ts` is NOT modified in this phase, and that the `Chord` model in `src/state/session.ts` is NOT modified (no `duration` or `bars` field added).
- Note any open decisions for Pilot review (see "Open decisions" section below).
- Note that the prototype-parity checklist applies to step 01.3 (ProgressionChips replacement) because it ports existing interaction logic.

Validation:
- No source code written.

Expected result:
- `docs/orbifold-v2/inventories/phase-01-inventory.md` present and complete.

CHECKPOINT → Commit message:
`docs(ux): Phase 01 step 01.1 — phase-01 inventory`

---

## Step 01.2 — Hide harmony-only header selectors and reposition drawer tabs

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, docs/orbifold-v2/inventories/phase-01-inventory.md, `src/ui/Header.svelte`, `src/ui/CodeDrawer.svelte`, `src/ui/CompositionDrawer.svelte`, and `src/app/app.css`. Implement Items A and B: conditional rendering for the key/clave/octave selectors in Header.svelte, and CSS repositioning of the two drawer tab buttons. These are the only files to change. Do not touch `src/core/**`, `src/state/session.ts`, `src/ui/ProgressionChips.svelte`, or Transport.svelte.

Implementation requirements:
- **Item A — Header.svelte:** Wrap the `<div class="field">` block (the clave/note/octave selector group, currently lines ~97–130) in `{#if $sessionStore.view === 'harmony'}…{/if}`. The brand, view-toggle segmented control, spacer, and tutorial link remain visible in all modes. No other changes to Header.svelte.
- **Item B — Tab repositioning (CSS-only):** Move `#codeTab` and `#compTab` so they sit above the Transport footer and do not overlap it. The Transport footer (`<footer class="glass">`) has `margin: 0 12px 10px` and `padding: 11px 18px`; at typical content heights its total box occupies roughly 60–70 px from the bottom. The repositioning must use `bottom` values that clear the footer — the exact value is left to the Dev to compute from the inventory findings, but the Pilot's open decision below constrains the approach. Apply changes to the global CSS in `app.css` for `#compTab` and to the scoped CSS in `CodeDrawer.svelte` for `#codeTab`. Both tabs must be positioned consistently (same `bottom` value; horizontal offsets unchanged relative to each other). Add a brief comment in the CSS explaining why the bottom offset was chosen (e.g., "clears the Transport footer").
- No new npm dependencies.
- AGPL-3.0 headers must be present and intact on all modified files.
- Audio output unchanged (no codegen touch).

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count must not regress below pre-phase baseline).
- `pnpm build` — exits 0.
- Manual parity note in handoff: open the app in Harmony mode — the key/clave/octave selects ARE visible; switch to Rhythm mode — they ARE hidden; switch back — they reappear. Both drawer tabs are visible without overlapping the Transport footer at 1440×900 and 375×812 viewport sizes (mobile).

Expected result:
- `Header.svelte` renders `.field` only when `$sessionStore.view === 'harmony'`.
- `#codeTab` and `#compTab` are visually clear of the Transport footer.
- All quality gates pass.

CHECKPOINT → Commit message:
`feat(ux): Phase 01 step 01.2 — hide harmony selectors in rhythm mode; reposition drawer tabs`

---

## Step 01.3 — Replace ProgressionChips with ProgressionStrip (equal-segment timeline)

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, docs/orbifold-v2/inventories/phase-01-inventory.md, `src/ui/ProgressionChips.svelte` (in full — this is the source being replaced), `src/state/session.ts` (Chord interface and all action imports used by ProgressionChips), and `src/app/App.svelte` (to confirm how ProgressionChips is mounted). Create `src/ui/ProgressionStrip.svelte` as the replacement component. Update `src/app/App.svelte` to import and use `ProgressionStrip` instead of `ProgressionChips`. Do not delete `ProgressionChips.svelte` in this step (removal is a separate cleanup decision for the Pilot). Do not modify `src/core/**`, `src/state/session.ts`, or `src/core/codegen/strudel.ts`.

Implementation requirements:
- **Visual:** The new strip renders the progression as a row of equal-width segments inside the Transport footer slot. Each segment represents one chord (one cycle / one bar). Segments share the available width equally (CSS `flex: 1` or equivalent). The label "progresión" and the empty-state hint ("toca acordes en el Tonnetz…") must be preserved.
- **Tonal-function colors:** Each segment uses the same tonal-function border coloring as the current chips: derive the CSS class via `diatonicLookup` (same `tonalClass` function logic from `ProgressionChips.svelte`). The gain fill gradient (`chipGainCss`) must also be preserved — the background of each segment reflects the per-chord gain as a bottom-to-top fill.
- **Gain drag (CRITICAL — must not regress):** Per-chord vertical drag gesture preserved exactly: `pointerdown` captures pointer; `pointermove` computes `dy = startY - e.clientY`, updates gain as `clamp(startGain + dy * 0.006, 0, 1.2)` with 3 px threshold; `pointerup` commits to store and calls `requeueLive()`. Prototype source: `ProgressionChips.svelte` `handlePointerDown/Move/Up`, which port prototype lines 1441–1466. The `touch-action: none` and `user-select: none` CSS rules must be present.
- **Tap-to-preview (CRITICAL — must not regress):** Tap gesture (pointer moved ≤ 3 px) calls `playChord(ch.rootPc, ch.qual, ch.gain)`. Keyboard equivalent (`Enter` / `Space`) also preserved.
- **Remove chord (✕ button):** Each segment has a remove button calling `clearChordAt(index)`, same as current chips.
- **CRITICAL — no codegen or model change:** `ProgressionStrip.svelte` reads only from `$sessionStore.harmony.progression`, `$sessionStore.harmony.root`, and `$sessionStore.harmony.mode`. It does NOT read or write any `duration` or `bars` field. It does NOT import or touch `src/core/codegen/strudel.ts`. The segments are always equal-width in Phase 01 because every chord occupies exactly 1 cycle. Variable width is Phase 02.
- **Byte-identical audio guarantee:** Because `ProgressionStrip` makes no changes to `session.ts` actions or `strudel.ts` codegen, the Strudel string produced for any given `SessionState` is identical to `main`. State this explicitly in the handoff.
- AGPL-3.0 license header in `ProgressionStrip.svelte`.
- Prototype parity: handoff must cite the source lines in `ProgressionChips.svelte` (and transitively in the prototype HTML, as already cited in the component header) for each critical interaction, and state observed behavioral equivalence.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count must not regress; no new tests are required for pure-CSS/visual changes, but if a segment-width computation helper is extracted to a pure function it should have a unit test).
- `pnpm build` — exits 0.
- Manual parity note in handoff: with a 4-chord progression loaded, the strip shows 4 equal-width segments; dragging a segment vertically changes its gain fill; tapping a segment triggers chord preview audio; the ✕ button removes the chord.

Expected result:
- `src/ui/ProgressionStrip.svelte` exists and is mounted in `App.svelte`.
- `ProgressionChips.svelte` is still present (not deleted).
- All critical interactions (gain drag, tap-preview, remove) are preserved.
- Strudel output is byte-identical to pre-phase `main` for identical input.
- All quality gates pass.

CHECKPOINT → Commit message:
`feat(ux): Phase 01 step 01.3 — ProgressionStrip equal-segment timeline replaces chips`

---

## Phase Acceptance

- **A-01-01** — In Rhythm mode (`$sessionStore.view === 'rhythm'`), the key/clave/octave selectors are NOT rendered in the header; in Harmony mode they ARE rendered.
  - Validation method: `manual`
- **A-01-02** — The "Código Strudel" and "Composición" tab buttons are visually above (not overlapping) the Transport footer at both 1440×900 and 375×812 viewport sizes.
  - Validation method: `manual`
- **A-01-03** — The progression is displayed as a row of equal-width segments (one per chord), replacing the draggable chips, and the empty-state hint is preserved.
  - Validation method: `manual`
- **A-01-04** — Each segment's background fill reflects the chord's gain value via the `chipGainCss` gradient (bottom-to-top fill proportional to gain 0–1.2), and tonal-function border coloring is applied correctly.
  - Validation method: `manual`
- **A-01-05** — Vertical drag on a segment changes its gain (threshold 3 px, step 0.006/px, clamp [0, 1.2]) and commits the new value to the store on pointer release, triggering `requeueLive()`.
  - Validation method: `manual`
- **A-01-06** — Tapping a segment (pointer move ≤ 3 px) plays the chord via `playChord(rootPc, qual, gain)`.
  - Validation method: `manual`
- **A-01-07** — The ✕ remove button on each segment removes the chord from the progression via `clearChordAt(index)`.
  - Validation method: `manual`
- **A-01-08** — The Strudel code string produced by `melodyLine` / `buildSession` for any given `SessionState` is byte-identical to pre-phase `main` (no codegen or `Chord` model change).
  - Validation method: `proxy:static-analysis` — confirmed by absence of changes to `src/core/codegen/strudel.ts` and `Chord` interface in `src/state/session.ts`; the handoff must state this explicitly.
- **A-01-09** — `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass clean at phase completion (test count ≥ pre-phase baseline).
  - Validation method: `unit` (automated gate)

## Partial coverage from prior phase

No prior partials to address. orbifold-v1 was a separate initiative; its acceptance IDs do not carry over. All three items in this phase are net-new UX improvements, not closures of prior partials.

## Open decisions (Pilot resolves at inventory checkpoint)

The following decisions must be resolved by the Pilot before step 01.2 implementation begins. The Dev MUST NOT pick a direction unilaterally.

**OD-01 — Drawer tab repositioning strategy**
Three options, each with trade-offs:
1. **Raise `bottom`:** Change `bottom: 14px` to `bottom: 80px` (or computed value) on both `#codeTab` and `#compTab`. Simple; tabs float above the footer. Risk: on small viewports the tabs may overlap stage content.
2. **Dock tabs into the Transport footer:** Add a dedicated tab-row div inside the Transport footer (in `Transport.svelte`) and render the tab buttons there as non-fixed elements. Cleaner layout; requires changes to Transport.svelte and the slot structure. More invasive.
3. **Move tabs to a corner:** Position both tabs to the left or right side of the viewport (e.g. `left: 12px` / `bottom: 80px`) rather than bottom-center. Less common pattern for drawer triggers.

The Pilot should choose option 1, 2, or 3 (or a variant) at inventory review.

**OD-02 — ProgressionStrip placement**
Currently, `ProgressionChips` is mounted in the Transport footer via `<slot />`. Two options for the strip:
1. **Keep it in the Transport slot:** The strip lives inside the footer as a flex row, same as today. Segment widths are bounded by the footer's available width.
2. **Move it above the footer:** Place the strip as its own full-width row between the stage and the Transport footer, giving it more horizontal room.

Recommendation: option 1 (keep in slot) for Phase 01, since it minimizes structural change. The Pilot may prefer option 2.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Progression display model (chips vs. strip vs. variable segments)** — Trigger: step 01.3. If the decision is made to permanently retire ProgressionChips.svelte (not just stop mounting it), record the rationale. Phase 02 will supersede this if variable-duration segments require a different data model — an ADR at that point covers both the Strudel construction and the display model together.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-01-handoff.md`. See `handoff-template.md`.
