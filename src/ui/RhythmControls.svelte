<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — RhythmControls component (empty shell).

  Phase 09 step 09.5 (ADR 0013 D3): all rhythm controls moved inline into
  Header.svelte behind {#if $sessionStore.view === 'rhythm'}.

  This component is left as an empty shell so that existing App.svelte import
  compiles without change. It renders nothing; the canvas overlay is gone.
  The import and <RhythmControls /> tag in App.svelte will be cleaned up in
  step 09.6 or a subsequent phase.
-->
