<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — HarmonyControls component.

  Phase 08 step 08.6: All controls relocated to Header.svelte.

  Previously contained:
    - .seg2#chordModeSeg (acorde / arpegio chord-mode control)
    - .tbtn#marco context capture button (📨 marco)

  These were relocated to src/ui/Header.svelte inside the
  {#if $sessionStore.view === 'harmony'} block per ADR 0011 Amendment §D6
  ("All harmony controls live together in the top bar; the canvas is fully freed").

  The canvas overlay (.orbit-ctl.glass) and its absolute-positioning CSS have
  been removed. The component is kept as an empty shell (not deleted) so
  App.svelte's <HarmonyControls /> reference compiles without change. If a
  future phase needs a canvas harmony overlay, it can be added here again.

  Prototype reference: .orbit-ctl#harmonyCtl (HTML lines 447–453, CSS lines 316–325).
  Phase 06 step 06.4: 📨 marco button added here (now moved to Header.svelte).
-->
