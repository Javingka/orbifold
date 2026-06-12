# ADR 0013 — Four-view primary navigation routing

- **Status:** Accepted
- **Date:** 2026-06-12
- **Initiative / Phase:** orbifold-v2 / Phase 09 (step 09.2)
- **Deciders:** Pilot (Javier)

## Context

The app has two primary views today — Armonía and Ritmo — toggled by a two-button segmented control in `Header.svelte`. Composición and Código Strudel exist as drawer overlays (`CompositionDrawer.svelte`, `CodeDrawer.svelte`) accessed via tab buttons anchored to the bottom edge of the screen. This arrangement hides important functionality behind a tertiary interaction pattern.

Phase 09 elevates Composición and Código Strudel to first-class primary views alongside Armonía and Ritmo, and simultaneously relocates the rhythm-specific Euclidean controls from a canvas overlay (`RhythmControls.svelte`) into the top bar (where they are hidden when another view is active). The bottom Transport row becomes transversal-only: play buttons and BPM, with no view-specific controls.

Four open questions were surfaced in the Phase 09 inventory (step 09.1). All four have been resolved by the Pilot before this ADR is written. This ADR records those resolutions as binding decisions for steps 09.3–09.6.

---

## Decisions

### D1 — View-type union: five strings; `'code'` is new; schema version bumps to 2

`SessionState.view` is widened from `'rhythm' | 'harmony' | 'composition' | 'session'` to:

```typescript
'rhythm' | 'harmony' | 'composition' | 'session' | 'code'
```

The four primary navigation views map to view-type strings as follows:

| Primary view label | `SessionState.view` string | Status |
|---|---|---|
| Armonía | `'harmony'` | existing |
| Ritmo | `'rhythm'` | existing |
| Composición | `'composition'` | existing |
| Código Strudel | `'code'` | **new** |

`'session'` is retained as a valid view-type string (not a primary navigation view). It is used by the combined Sesión transport mode (the ▶ Sesión play button that plays rhythm and harmony together). It remains in the type union so that any session saved while `SessionState.view === 'session'` can still be loaded and validated. `'session'` is not a destination that the four-tab nav can navigate to; it can only be set programmatically by the transport logic if any such path exists in the current codebase.

**Persistence schema version bump required.** `'code'` is a new value the persisted `view` field can take — a session saved while the user is on the Código Strudel view writes `view: 'code'` to the blob. The current `SavedSessionSchema` (version 1) declares `view: z.enum(['rhythm', 'harmony', 'composition', 'session'] as const)`, which does not include `'code'`. A blob with `view: 'code'` therefore fails validation under version 1.

Step 09.3 must:
1. Increment `SESSION_SCHEMA_VERSION` from `1` to `2`.
2. Replace the `view` enum with one that includes `'code'`: `z.enum(['rhythm', 'harmony', 'composition', 'session', 'code'] as const)`.
3. Add a safe fallback: loading a session whose `view` value is not recognized (including old or future unknown strings) silently defaults to `'harmony'` rather than throwing. Implementation: a `.catch('harmony')` or a `z.string().transform(...)` guard after the enum so that `safeParse` failures on the `view` field produce a usable session rather than a null/dropped blob.

**No migration path for version 1 blobs.** The existing `safeParse` behavior already drops blobs that fail schema validation (returning `null` from `loadSavedSession`). Bumping `SESSION_SCHEMA_VERSION` to 2 means version 1 blobs fail the `z.literal(1)` version check and are dropped — this is the existing graceful-degradation behavior. No migration function is introduced; the user begins a fresh session. The Pilot is aware of this tradeoff (documented in the inventory, section "Persistence schema impact").

**Justification:** Option B (add `'code'` as a fifth string, retain `'session'`) was chosen over Option A (reuse/overload `'session'` for code) and Option C (rename all strings). `'session'` as a semantic carrier of "combined rhythm+harmony transport mode" is already established in `NowPlaying.source` and the ▶ Sesión button; overloading it with "the code editor view" creates ambiguity. Option C has the largest blast radius (existing session blobs with `view: 'session'` would fail validation without a migration path). Option B's blast radius is minimal: one new string, a schema version bump, and a safe fallback.

---

### D2 — View routing for Composición and Código Strudel: Option D variant D1

The existing `CompositionDrawer.svelte` and `CodeDrawer.svelte` components are **reused as the content** for the elevated primary views. The drawer slide mechanism (`position:fixed` + `transform:translateY(105%/108%)`) is replaced by a flex-fill layout inside `#stage`. The components are gated with `{#if}` blocks in `App.svelte`.

**Exact mechanism:**

1. The drawer tab buttons (`#codeTab` in `CodeDrawer.svelte`, `#compTab` in `CompositionDrawer.svelte`) are removed from both components.
2. The `position:fixed; bottom:0; transform:translateY(105%/108%)` slide CSS for `#codeDrawer` and `#compDrawer` (declared in the components' `<style>` blocks and in `app.css`) is replaced with CSS that makes the content fill the `#stage` flex container (e.g., `flex:1; height:100%; overflow:auto; position:relative`).
3. `App.svelte` wraps the two components in `{#if $sessionStore.view === 'composition'}` and `{#if $sessionStore.view === 'code'}` blocks respectively. When the view matches, the component mounts and fills the stage. When the view changes, the component unmounts.
4. The `<canvas>` element (PIXI renderer) remains in the DOM for all views but is hidden (via `stage.ts setView` setting both PIXI layers to `visible: false`) for the `'composition'` and `'code'` views. The canvas element itself stays mounted; only the PIXI layer visibility is toggled.

**rAF loop on mount:** `CompositionDrawer.svelte` starts its rAF playhead loop in `onMount` (via `ensureLoop()`). Under the `{#if}` gate the component is destroyed on view switch and re-mounted when the user returns to the Composición view. The rAF loop therefore restarts cleanly on each mount — confirmed safe by the early-return guard inside `compTickLoop` (the loop checks `open` on each frame and returns early if false). After D2 the `open` variable in `CompositionDrawer` is always `true` while mounted (the `{#if}` gate replaces the slide open/close mechanic), so `compTickLoop` runs continuously while the Composición view is active and stops on unmount.

**Options E and F were evaluated and rejected:**
- Option E (extract content into new `CompositionView` and `CodeView` components) is the cleanest lifecycle but requires ~1 100 new lines of duplication with high regression risk on the composition drag/grip state.
- Option F (force-open existing drawers via reactive `$:`) does not achieve a full-canvas view — the composition drawer is max 74vh tall and bottom-anchored, leaving an empty PIXI canvas above it. F disqualifies on UX grounds.

**Justification:** D1 achieves full-canvas UX for both elevated views with ~70–80 lines of change. The content is not duplicated. The tab buttons are explicitly removed (not hidden behind conditional logic) to cleanly sever the old drawer metaphor.

---

### D3 — Rhythm controls move inline into `Header.svelte`; local state stays inline

All rhythm-specific controls currently in `RhythmControls.svelte` (the `.orbit-ctl.glass#orbitCtl` overlay) move into `Header.svelte`, inside a `{#if $sessionStore.view === 'rhythm'}` guard.

**Controls that move:**
- Morph toggle button (▭ lineal / ▭ radial) — calls `setMorphTarget`
- Sound select (`euclidSound`)
- E(k,n) readout with k/n/r sliders
- Named-pattern info span
- Preview toggle (▶ oír / ■ stop)
- + órbita button (calls `addEuclidLayer`)
- + capa vacía button (calls `addEmptyLayer`)
- 📨 base context button (calls `agentCtx`)

**Transient local state:** All five local variables (`euclidSound`, `euclidK`, `euclidN`, `euclidR`, `morphTarget`) and their reactive declarations (`euclidRMax`, `euclidInfo`, `isPreviewing`) are placed inline in `Header.svelte`'s `<script lang="ts">` block — no dedicated `RhythmHeader.svelte` sub-component. This mirrors how the harmony controls (key selector, subview toggle, register mode toggle) already live inline in `Header.svelte`. The inventory confirmed zero naming collisions between the rhythm control variables and the existing `Header.svelte` locals.

**State lifecycle:** Because `Header.svelte` is mounted for the entire app lifetime, the rhythm control variables persist across view switches. Navigating from Ritmo to Armonía and back preserves `euclidK`, `euclidN`, `euclidR`, `euclidSound`, and `morphTarget` exactly as left — this is the correct behavior.

**New imports into `Header.svelte`:** `addEuclidLayer`, `addEmptyLayer`, `previewEuclid`, `hushAll` from `session.ts`; `setMorphTarget` from `rhythm-scene.ts`. `agentCtx` from `agentCtx.ts` is already imported.

**`RhythmControls.svelte` fate:** The component's content (the `.orbit-ctl.glass#orbitCtl` div and all its CSS) is removed. The component is left as an empty shell (AGPL-3.0 comment + relocation note) or deleted from `App.svelte` entirely. Step 09.5 records the final choice in its handoff.

**Justification:** Inline state in `Header.svelte` mirrors the existing pattern for harmony controls. A dedicated sub-component would add a file and import indirection without benefit — the rhythm controls are a fixed, bounded set of UI elements (confirmed in the inventory) with no naming collisions.

---

### D4 — Transport footer is transversal-only; "Sesión" button is retained

After Phase 09, the bottom Transport row (`Transport.svelte`) contains only transversal controls. Every control currently in `Transport.svelte` was classified as transversal in the inventory audit:

| Control | Classification | Phase 09 action |
|---|---|---|
| Now-playing pill | Transversal | Stays |
| ▶ Ritmo | Transversal | Stays |
| ▶ Armonía | Transversal | Stays |
| ▶ Sesión | Transversal | **Stays** (OQ-4 resolved) |
| ■ silencio | Transversal | Stays |
| BPM slider + readout | Transversal | Stays |
| TAP | Transversal | Stays |
| `<LatencyCalibration />` | Transversal | Stays |

The ▶ Sesión button (which plays rhythm and harmony together) is explicitly retained in the Transport footer. The reasoning: each engine (rhythm, harmony, composition) can still be played independently regardless of which primary view is active, consistent with the app's always-obvious-what-is-playing invariant (CLAUDE.md §guardrails). Retiring ▶ Sesión would remove a transport capability, not just relocate a UI element.

No changes are required in `Transport.svelte` itself in Phase 09. The Transport row already satisfies A-09-10 structurally — it contains no view-specific controls.

The composition transport row (▶ tocar / ⏸ pausa / ■ stop / limpiar todo) lives inside `CompositionDrawer.svelte` and is view-specific to the Composición view. It stays inside that component; it does not move to `Transport.svelte`.

**Justification:** The Pilot resolved OQ-4 as "Sesión stays." The inventory confirmed that all existing Transport controls are transversal. The simplest compliant implementation is no change to `Transport.svelte`.

---

### D5 — Per-view hint text gating in `App.svelte`

Each primary view shows hint or instruction text in the canvas/content area, gated by `$sessionStore.view` (and `$sessionStore.harmony.subview` for the Armonía sub-views). The hint block in `App.svelte` is extended to cover all four primary views:

| View condition | Hint shown |
|---|---|
| `view === 'harmony'` and `subview === 'tonnetz'` | Existing Tonnetz instruction (Click en un triángulo / Shift+Click P·L·R…) |
| `view === 'harmony'` and `subview === 'staff'` | Existing Pentagrama instruction |
| `view === 'rhythm'` | Rhythm-specific hint, e.g.: "Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla." |
| `view === 'composition'` | No canvas hint — the Composición view has built-in labels inside `CompositionDrawer.svelte` |
| `view === 'code'` | No canvas hint — the Código Strudel view has built-in labels inside `CodeDrawer.svelte` |

The rhythm hint is a new `{:else if $sessionStore.view === 'rhythm'}` branch appended to the existing `{#if $sessionStore.view === 'harmony'}` block. For Composición and Código Strudel, no additional hint block is needed — the PIXI canvas is hidden for those views and the drawer content provides its own instructions.

**Justification:** Per-view hint text was established as a pedagogical invariant at kickoff (CLAUDE.md §guardrails: "Pedagogical: live code drawer, tooltips on key terms…"). The rhythm view currently shows no hint because the rhythm controls overlay covered the canvas area where a hint would appear. With the overlay gone (D3), a hint block for Ritmo becomes unobstructed. The composition and code views embed their own instructional labels natively in the component templates.

---

## Consequences

1. **`SessionState.view` type widens from 4 to 5 strings.** Every TypeScript call site that switches on `view` gains a new case to handle (`'code'`). The stage.ts `setView` signature must be widened to accept all five values. `tonnetz-scene.ts` and `harmony-staff-scene.ts` already early-return on non-matching view strings — they require no changes.

2. **`SavedSessionSchema` version bumps from 1 to 2.** Existing user sessions stored as version 1 blobs will fail validation on reload and be dropped (the existing graceful-degradation behavior). No migration function is introduced. The user begins a fresh session.

3. **Drawer tab buttons `#codeTab` and `#compTab` are removed permanently.** They must not appear in the UI after Phase 09. Static analysis check at step 09.6: `grep -rn "#codeTab\|#compTab" src/ui/` must return 0 matches.

4. **The canvas overlay `RhythmControls.svelte` is emptied or deleted.** Static analysis check at step 09.6: `grep -rn "orbit-ctl" src/ui/` must return 0 matches.

5. **`Header.svelte` grows by approximately 80–100 lines** (rhythm control template and state). The component remains a single file with no sub-component extraction (D3). If the header becomes unwieldy in a future phase, extraction of rhythm or harmony controls into sub-components is a possible refactor — but that refactor is out of scope for Phase 09.

6. **`CompositionDrawer.svelte` and `CodeDrawer.svelte` remain as the content components** for the elevated primary views. Their templates and script logic are unchanged except for the removal of the tab buttons. The `open` boolean and the slide CSS become vestigial for the primary-view path but may remain in the files as dead code (or be cleaned up in a future refactor phase). Step 09.4 records the final cleanup decision in its handoff.

7. **The `PX_PER_CYCLE = 48` coordination rule (Decisions Register) is not affected by Phase 09 changes.** No edits to `time-map.ts` or `ProgressionStrip.svelte` in this phase.

8. **`registerMode` and `subview` ephemeral-state rule (Decisions Register) is not affected.** Phase 09 does not add persistence for these fields.
