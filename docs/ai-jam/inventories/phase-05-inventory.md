<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 05 — Catalog Expansion, 16-Step Constraint, and Informed Improvisation — Inventory

**Step:** 05.1  
**Date:** 2026-06-19  
**Status:** DRAFT — awaiting Pilot resolution of OD-1 (new rhythm entries) and OD-2 (prompt structure)

---

## §1 — Catalog Gap Analysis

### 1.1 Existing 31 entries, grouped by family / meter

| # | id | name | family | meter | steps | strategy |
|---|-----|------|--------|-------|-------|----------|
| 1 | `tresillo` | Tresillo | clave | 4/4 | 8 | euclid E(3,8,0) |
| 2 | `cinquillo` | Cinquillo | clave | 4/4 | 8 | euclid E(5,8,0) |
| 3 | `habanera-euclid` | Habanera Cell (Euclidean) | clave | 4/4 | 8 | euclid E(3,8,3) |
| 4 | `eighth-half` | Half-Bar 8th Cell | straight | 4/4 | 8 | euclid E(2,8,0) |
| 5 | `seven-of-eight` | Seven-of-Eight | dense | 4/4 | 8 | euclid E(7,8,0) |
| 6 | `four-of-eight` | Four-of-Eight (8th Notes) | straight | 4/4 | 8 | euclid E(4,8,0) |
| 7 | `bell-pattern-west-african` | West-African Bell Pattern | bell-pattern | 12/8 | 12 | euclid E(7,12,0) |
| 8 | `sparse-bell-12` | Sparse Bell (12/8) | bell-pattern | 12/8 | 12 | euclid E(5,12,0) |
| 9 | `minimal-12` | Minimal Triplet Cell (12/8) | straight | 12/8 | 12 | euclid E(3,12,0) |
| 10 | `standard-12` | Standard Triplet Quarter (12/8) | straight | 12/8 | 12 | euclid E(4,12,0) |
| 11 | `euclid-5-16` | Euclidean 5-of-16 | euclidean | 4/4 | 16 | euclid E(5,16,0) |
| 12 | `euclid-7-16` | Euclidean 7-of-16 | euclidean | 4/4 | 16 | euclid E(7,16,0) |
| 13 | `euclid-9-16` | Euclidean 9-of-16 | euclidean | 4/4 | 16 | euclid E(9,16,0) |
| 14 | `euclid-3-16` | Euclidean 3-of-16 (Sparse) | euclidean | 4/4 | 16 | euclid E(3,16,0) |
| 15 | `euclid-11-16` | Euclidean 11-of-16 | euclidean | 4/4 | 16 | euclid E(11,16,0) |
| 16 | `eighth-notes-16` | 8th Notes (16-step grid) | straight | 4/4 | 16 | euclid E(8,16,0) |
| 17 | `quarter-notes-16` | Quarter Notes (16-step grid) | straight | 4/4 | 16 | euclid E(4,16,0) |
| 18 | `cascara-euclid` | Cascara (Euclidean 10-of-16) | cascara | 4/4 | 16 | euclid E(10,16,0) |
| 19 | `three-of-four` | 3-of-4 (Dotted Quarter Feel) | euclidean | 3/4 | 4 | euclid E(3,4,0) |
| 20 | `aksak-7-sparse` | Aksak 7/8 — Sparse | aksak | 7/8 | 7 | euclid E(3,7,0) |
| 21 | `aksak-7-dense` | Aksak 7/8 — Dense | aksak | 7/8 | 7 | euclid E(4,7,0) |
| 22 | `aksak-9-medium` | Aksak 9/8 — Medium | aksak | 9/8 | 9 | euclid E(4,9,0) |
| 23 | `aksak-9-dense` | Aksak 9/8 — Dense | aksak | 9/8 | 9 | euclid E(5,9,0) |
| 24 | `five-sparse` | 5/4 Sparse | euclidean | 5/4 | 5 | euclid E(2,5,0) |
| 25 | `five-medium` | 5/4 Medium | euclidean | 5/4 | 5 | euclid E(3,5,0) |
| 26 | `son-clave-3-2` | Son Clave 3-2 | clave | 4/4 | 16 | struct |
| 27 | `son-clave-2-3` | Son Clave 2-3 | clave | 4/4 | 16 | struct |
| 28 | `rumba-clave-3-2` | Rumba Clave 3-2 | clave | 4/4 | 16 | struct |
| 29 | `rumba-clave-2-3` | Rumba Clave 2-3 | clave | 4/4 | 16 | struct |
| 30 | `bossa-nova-clave` | Bossa Nova Clave | clave | 4/4 | 16 | struct |
| 31 | `backbeat-snare` | Backbeat Snare | backbeat | 4/4 | 16 | struct |

**Family/meter coverage summary:**

| Meter | Strategy | Count |
|-------|----------|-------|
| 4/4 | euclid 8-step | 6 |
| 12/8 | euclid 12-step | 4 |
| 4/4 | euclid 16-step | 8 |
| 3/4 | euclid odd | 1 (4-step only) |
| 7/8 | euclid odd | 2 |
| 9/8 | euclid odd | 2 |
| 5/4 | euclid odd | 2 |
| 4/4 | struct 16-step | 6 |

### 1.2 Identified gaps

**Critical gaps (named by Pilot / phase spec):**

| Gap | Meter | Notes |
|-----|-------|-------|
| Cueca chilena | 3/4 or 6/8 | Only existing 3/4 entry is `three-of-four` (4-step, quarter-note feel) — no characteristic 6/8 compound feel |
| Cumbia bass | 4/4 | No cumbia-family entry |
| Candombe-inspired | 2/4 or 6/8 | No Uruguayan/Rioplatense entries |
| Samba esquema | 2/4 | No samba surdo pattern |
| Baladi / maqsum | 4/4 | No Middle-Eastern patterns (despite wide global influence) |
| Flamenco bulería | 12/8 | No flamenco entries — 12/8 is covered but not with bulería accent placement |
| Afrobeat hi-hat dense | 4/4 | Existing cascara (E(10,16)) is close; no specifically dense hi-hat pattern |
| Bossa nova repique | 4/4 | Existing `bossa-nova-clave` is the clave only; tamborim/repique pattern missing |
| Gnawa / guembri | 12/8 | No North-African entries |
| Soca / Calypso | 4/4 | No Caribbean (non-Cuban) entries |

**Additional gaps identified by Dev:**

| Gap | Meter | Notes |
|-----|-------|-------|
| Aksak 9/8 sparse | 9/8 | Only medium (4-onset) and dense (5-onset) exist; sparse (3-onset) missing |
| 11/8 Balkan | 11/8 | No 11-step Balkan meter |
| Euclid 6-of-16 | 4/4 | E(6,16) is a musically distinct pattern (sits between sparse and medium) |
| Waltz 6-step | 3/4 | Existing 3/4 is only 4-step; a 6-step waltz grid with downbeat feel is distinct |
| Guaguancó-inspired | 4/4 | Cinquillo family, rotation variant |

---

## §2 — Open Decision OD-1: Which New Rhythm Entries to Add

**Pilot must resolve this before step 05.2.**

The following table presents all 19 candidate entries. The minimum target is 14 new entries to reach ≥45 total (31 + 14 = 45). The Pilot selects any subset of ≥14.

Binary strings below are pre-computed from the real bjorklund() engine (verified in inventory step). Each binary string will be verified by the congruence test suite (invariant 5) during step 05.2.

### Candidate A — Cueca-style entries (3/4 / 6/8)

**A1 — Cueca Chilena 6/8 (12-step, euclid)**

A cueca-style 6/8 compound compound meter in a 12-step grid. In Chile's cueca, the 6/8 feel alternates between groups of 3 and groups of 2. E(6,12,0) produces perfectly even 8th-note hits across 12 steps — this is the rhythmic skeleton; the characteristic uneven syncopation requires a struct entry (see A2).

| Field | Value |
|-------|-------|
| id | `cueca-6-8-even` |
| name | Cueca-Style 6/8 Even (12-step) |
| meter | `6/8` |
| steps | 12 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 6, n: 12, rot: 0 }` |
| binary | `101010101010` |
| traditions | `['Chilean folk-inspired', 'Latin', '6/8 compound']` |
| cultural note | Even subdivision of 6/8 compound meter; skeleton for cueca-family patterns. The actual cueca's characteristic anacrusis feel requires the struct entry A2. |

**A2 — Cueca Chilena Characteristic (12-step, struct)**

The authentic cueca cell in 6/8 is: strong beat (1), anacrusis figure (1-2), rhythmic cadence. A common 12-step binary for the characteristic cueca pattern: onsets at 0, 2, 4, 7, 9 — giving the "zapateado" feel of 3+3+2+2+2 subdivision.

| Field | Value |
|-------|-------|
| id | `cueca-chilena-zapateado` |
| name | Cueca Chilena Zapateado (6/8, struct) |
| meter | `6/8` |
| steps | 12 |
| strudelStrategy | `struct` |
| binary | `101010010100` |
| onsets | 0, 2, 4, 7, 9 |
| traditions | `['Chilean folk-inspired', 'cueca']` |
| cultural note | Represents the zapateado cell in Chilean cueca. The "corte" of the cueca is a non-Euclidean asymmetric accent pattern. |

**NOTE for Pilot on 6/8 vs 3/4:** The existing `three-of-four` (E(3,4,0), 4-step) uses `meter: '3/4'`. Cueca is compound duple, best represented as `meter: '6/8'` with a 12-step grid. This requires the Pilot to decide whether to use `'6/8'` as a new meter label or fold it into `'12/8'`. The phase spec says "cueca chilena (3/4)" but musically cueca is 6/8. Recommended: use `meter: '6/8'` for both entries — it is distinct from `12/8` (which implies a slower compound feel). Alternatively, accept `'3/4'` with a 6-step grid. The Pilot should explicitly confirm the meter string.

---

### Candidate B — Candombe-inspired (2/4, euclid)

**B1 — Candombe Piano-Inspired (8-step, euclid)**

Candombe is the Afro-Uruguayan tradition performed in processions. The "piano" (smallest drum) pattern has a characteristic off-beat feel. E(3,8,2) gives `01001010` — onset at positions 1, 4, 6 — close to the piano clave.

| Field | Value |
|-------|-------|
| id | `candombe-piano-8` |
| name | Candombe Piano-Inspired (8-step) |
| meter | `4/4` |
| steps | 8 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 3, n: 8, rot: 2 }` |
| binary | `01001010` |
| traditions | `['candombe-inspired', 'Uruguayan-inspired', 'Afro-Rioplatense']` |
| cultural note | Approximates the piano drum's off-beat character in Afro-Uruguayan candombe. Non-authoritative — described as "inspirado en" candombe. |

---

### Candidate C — Samba-inspired (8-step, euclid)

**C1 — Samba Surdo-Inspired (8-step, euclid)**

The samba surdo (bass drum) produces the characteristic "2 and 4" feel of samba. E(3,8,1) gives `00100101` — onsets at 2, 5, 7 — approximating the surdo's one-and-two feel in 8-step.

| Field | Value |
|-------|-------|
| id | `samba-surdo-8` |
| name | Samba Surdo-Inspired (8-step) |
| meter | `4/4` |
| steps | 8 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 3, n: 8, rot: 1 }` |
| binary | `00100101` |
| traditions | `['samba-inspired', 'Brazilian-inspired', 'Afro-Brazilian']` |
| cultural note | Approximates the surdo bass drum's answer feel in samba. Non-authoritative. |

---

### Candidate D — Baladi / Maqsum-inspired (4/4, 16-step euclid)

**D1 — Baladi-Inspired Euclid (16-step, euclid)**

Middle-Eastern baladi/maqsum is a 4/4 pattern with characteristic hits on beats 1 (dum), and 2.5/3 (tek). E(7,16,0) gives `1001010100101010` — 7 onsets at positions 0,3,5,7,10,12,14.

| Field | Value |
|-------|-------|
| id | `baladi-euclid-16` |
| name | Baladi/Maqsum-Inspired Euclid (16-step) |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 7, n: 16, rot: 0 }` |
| binary | `1001010100101010` |
| traditions | `['Middle Eastern-inspired', 'baladi-inspired', 'tabla patterns']` |
| cultural note | E(7,16) approximates baladi/maqsum tabla feel. Not a literal transcription; described as "inspirado en" Middle-Eastern tabla patterns. NOTE: E(7,16,0) is the same as the existing `euclid-7-16` entry. See conflict note below. |

**CONFLICT NOTE:** `euclid-7-16` already exists with binary `1001010100101010`. This is E(7,16,0). Proposal D1 as stated is a duplicate. Two options: (a) skip D1 and use a different rotation or onset count; (b) use E(7,16,4) = `0101001010101001` as `baladi-euclid-16-rot`. The Pilot should decide whether to add a rotation variant or skip this slot and fill with another candidate.

**D1-alt — Baladi-Rotation Variant (16-step, euclid)**

| Field | Value |
|-------|-------|
| id | `baladi-euclid-rot` |
| name | Baladi/Maqsum Rotation Variant (16-step) |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 7, n: 16, rot: 4 }` |
| binary | `0101001010101001` |
| traditions | `['Middle Eastern-inspired', 'maqsum-inspired']` |
| cultural note | Different phase of E(7,16) — the off-beat entry. |

---

### Candidate E — Flamenco Bulería-Inspired (12/8, euclid)

**E1 — Bulería-Inspired (12-step, euclid)**

Flamenco bulería is a 12/8 or 12-beat form with characteristic accents on beats 3, 6, 8, 10, 12. E(7,12,5) gives `101101010110` — onsets at 0,2,3,5,7,9,10.

| Field | Value |
|-------|-------|
| id | `buleria-12` |
| name | Flamenco Bulería-Inspired (12-step) |
| meter | `12/8` |
| steps | 12 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 7, n: 12, rot: 5 }` |
| binary | `101101010110` |
| traditions | `['flamenco-inspired', 'Andalusian-inspired', 'Spanish folk-inspired']` |
| cultural note | E(7,12) at rotation 5 approximates the asymmetric feel of flamenco bulería. Non-authoritative. |

---

### Candidate F — Afrobeat Hi-Hat Dense (4/4, 16-step, euclid)

**F1 — Afrobeat Hi-Hat Dense (16-step, euclid)**

Dense Afrobeat hi-hat: E(13,16,0) gives `1011110111101111` — 13 onsets, only 3 rests, creating a very dense pattern with characteristic breathing spaces.

| Field | Value |
|-------|-------|
| id | `afrobeat-hihat-dense-16` |
| name | Afrobeat Hi-Hat Dense (16-step) |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 13, n: 16, rot: 0 }` |
| binary | `1011110111101111` |
| traditions | `['Afrobeat', 'West African', 'highlife-inspired']` |
| cultural note | Dense 16th-note hi-hat feel characteristic of Fela Kuti-era Afrobeat. |

---

### Candidate G — Gnawa Guembri-Inspired (12-step, euclid)

**G1 — Gnawa Guembri-Inspired (12-step, euclid)**

The Gnawa guembri (3-string bass lute) plays a hypnotic interlocking pattern in 12/8. E(5,12,3) gives `101001010100` — onsets at 0,2,5,7,9.

| Field | Value |
|-------|-------|
| id | `gnawa-guembri-12` |
| name | Gnawa Guembri-Inspired (12-step) |
| meter | `12/8` |
| steps | 12 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 5, n: 12, rot: 3 }` |
| binary | `101001010100` |
| traditions | `['Gnawa-inspired', 'North African-inspired', 'trance-groove']` |
| cultural note | Approximates the off-beat interlocking feel of guembri bass. Source: Toussaint (2013) Chapter 9. |

---

### Candidate H — Cumbia Bass-Inspired (4/4, 16-step, euclid)

**H1 — Cumbia Bass-Inspired Euclid (16-step, euclid)**

Cumbia (Colombian) bass drum pattern: characteristic is on the half-beat. E(6,16,0) gives `1001010010010100` — 6 onsets at 0,3,5,8,11,13.

| Field | Value |
|-------|-------|
| id | `cumbia-euclid-16` |
| name | Cumbia Bass-Inspired Euclid (16-step) |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 6, n: 16, rot: 0 }` |
| binary | `1001010010010100` |
| traditions | `['cumbia-inspired', 'Colombian-inspired', 'Latin American']` |
| cultural note | E(6,16) approximates the driving syncopated bass feel of Colombian cumbia. |

---

### Candidate I — Bossa Nova Tamborim-Inspired (4/4, 16-step, struct)

**I1 — Bossa Nova Tamborim-Inspired (16-step, struct)**

The existing `bossa-nova-clave` entry captures the rhythmic clave. A distinct pattern in bossa nova is the tamborim (small frame drum) repique, which plays a 16-step asymmetric figure. The canonical tamborim pattern has onsets at 0,2,5,7,8,10,13 — non-Euclidean.

| Field | Value |
|-------|-------|
| id | `bossa-tamborim-16` |
| name | Bossa Nova Tamborim-Inspired (16-step) |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `struct` |
| binary | `1010010101010010` |
| onsets | 0, 2, 5, 7, 9, 11, 14 |
| traditions | `['bossa nova-inspired', 'Brazilian-inspired', 'samba-inspired']` |
| cultural note | Approximates tamborim/repique figure found in bossa nova and baião. Distinct from existing `bossa-nova-clave`. |

---

### Candidate J — Soca / Calypso-Inspired (4/4, 16-step, struct)

**J1 — Soca/Calypso-Inspired (16-step, struct)**

Soca (Caribbean, Trinidad-origin) has a characteristic "engine room" pattern: bass on beats 1 and 3 with driving 8th-note offbeats. The classic "iron" (triangle) pattern in calypso is non-Euclidean.

| Field | Value |
|-------|-------|
| id | `soca-calypso-16` |
| name | Soca/Calypso-Inspired (16-step) |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `struct` |
| binary | `1000100010001001` |
| onsets | 0, 4, 8, 12, 15 |
| traditions | `['soca-inspired', 'calypso-inspired', 'Caribbean']` |
| cultural note | Strong beats 1 and 3 with an anticipation hit — typical of soca "engine room" feel. |

---

### Candidate K — Guaguancó-Inspired (4/4, 8-step, euclid)

**K1 — Guaguancó-Inspired (8-step, euclid)**

Guaguancó is a form of rumba. The característic clave/cáscara rotation has 5 onsets in 8 steps. E(5,8,1) gives `01101101` — onsets at 1,2,4,5,7.

| Field | Value |
|-------|-------|
| id | `guaguanco-euclid-8` |
| name | Guaguancó-Inspired (8-step) |
| meter | `4/4` |
| steps | 8 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 5, n: 8, rot: 1 }` |
| binary | `01101101` |
| traditions | `['guaguancó-inspired', 'Afro-Cuban rumba-inspired']` |
| cultural note | Off-beat rotation of E(5,8) — evokes the dense cinquillo feel of guaguancó. |

---

### Candidate L — Aksak 9/8 Sparse (9-step, euclid)

**L1 — Aksak 9/8 Sparse (9-step, euclid)**

The catalog has `aksak-9-medium` (E(4,9)) and `aksak-9-dense` (E(5,9)) but lacks a sparse (3-onset) variant. E(3,9,0) gives `100100100` — evenly-spaced triple-accent feel.

| Field | Value |
|-------|-------|
| id | `aksak-9-sparse` |
| name | Aksak 9/8 — Sparse (3 onsets) |
| meter | `9/8` |
| steps | 9 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 3, n: 9, rot: 0 }` |
| binary | `100100100` |
| traditions | `['Balkan', 'Turkish', 'aksak']` |
| cultural note | Three evenly-spaced hits across 9 beats — a minimalist 9/8 feel. |

---

### Candidate M — Waltz 6-step (3/4, euclid)

**M1 — Waltz 6-step (3/4, euclid)**

A 6-step waltz grid (8th-note resolution in 3/4). E(2,6,0) gives `100100` — two downbeats at positions 0 and 3, simulating beats 1 and 2 of a waltz in 8th-note resolution.

| Field | Value |
|-------|-------|
| id | `waltz-6-sparse` |
| name | Waltz 6/8 Sparse (6-step) |
| meter | `3/4` |
| steps | 6 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 2, n: 6, rot: 0 }` |
| binary | `100100` |
| traditions | `['waltz-inspired', 'European folk', '3/4 groove']` |
| cultural note | Two-beat waltz skeleton in 6th-note resolution — classical oom-pah feel. |

---

### Candidate N — Euclid 6-of-16 (4/4, 16-step, euclid)

**N1 — Euclidean 6-of-16 (4/4, euclid)**

E(6,16,0) gives `1001010010010100` — 6 onsets, sitting between the sparse E(5,16) and medium E(7,16). Musically useful as a medium-sparse groove layer.

| Field | Value |
|-------|-------|
| id | `euclid-6-16` |
| name | Euclidean 6-of-16 |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 6, n: 16, rot: 0 }` |
| binary | `1001010010010100` |
| traditions | `['Toussaint', 'generic']` |
| cultural note | E(6,16) fills the gap between E(5,16) and E(7,16) in the catalog — musically distinct from both. |

---

### Candidate O — Aksak 11/8 (11-step, euclid)

**O1 — Aksak 11/8 Sparse (11-step, euclid)**

Balkan 11/8 (çiftetelli, some Greek dances). E(4,11,0) gives `10010010010` — 4 evenly-spaced onsets.

| Field | Value |
|-------|-------|
| id | `aksak-11-sparse` |
| name | Aksak 11/8 — Sparse (4 onsets) |
| meter | `11/8` |
| steps | 11 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 4, n: 11, rot: 0 }` |
| binary | `10010010010` |
| traditions | `['Balkan', 'Greek-inspired', 'aksak', '11/8']` |
| cultural note | 11/8 Balkan feel (çiftetelli family). Adds a new meter to the aksak family. |

---

### Candidate P — Additional 12/8 patterns

**P1 — Afrobeat 12/8 Bell Variant (12-step, euclid)**

A denser 12/8 bell pattern (not in catalog). E(6,12,0) gives `101010101010` — evenly alternating hits; effective as a hi-hat layer in 12/8 contexts.

| Field | Value |
|-------|-------|
| id | `afrobeat-12-even` |
| name | Afrobeat 12/8 Even Bell (12-step) |
| meter | `12/8` |
| steps | 12 |
| strudelStrategy | `euclid` |
| euclid | `{ k: 6, n: 12, rot: 0 }` |
| binary | `101010101010` |
| traditions | `['Afrobeat', 'highlife', 'West African']` |
| cultural note | Dense 12/8 hi-hat pattern — complementary layer to the sparser bell patterns in the catalog. |

---

### Candidate Q — Struct Cumbia (4/4, 16-step, struct)

**Q1 — Cumbia Tambor Mayor (16-step, struct)**

The tambor mayor (lead drum) in Colombian cumbia plays a characteristic 16-step syncopated pattern: onsets at 0, 3, 6, 8, 12, 14 — distinct from the Euclidean approximation in H1.

| Field | Value |
|-------|-------|
| id | `cumbia-tambor-16` |
| name | Cumbia Tambor Mayor-Inspired (16-step) |
| meter | `4/4` |
| steps | 16 |
| strudelStrategy | `struct` |
| binary | `1001001010001010` |
| onsets | 0, 3, 6, 8, 12, 14 |
| traditions | `['cumbia-inspired', 'Colombian-inspired', 'Caribbean Latin']` |
| cultural note | Tambor mayor pattern — the lead drum in Colombian cumbia processions. Non-authoritative approximation. |

---

### OD-1 summary table for Pilot

| Candidate | id | meter | steps | strategy | Target for 45? |
|-----------|----|-------|-------|----------|----------------|
| A1 | `cueca-6-8-even` | 6/8 | 12 | euclid | Pilot selects |
| A2 | `cueca-chilena-zapateado` | 6/8 | 12 | struct | Pilot selects (priority per spec) |
| B1 | `candombe-piano-8` | 4/4 | 8 | euclid | Pilot selects |
| C1 | `samba-surdo-8` | 4/4 | 8 | euclid | Pilot selects |
| D1-alt | `baladi-euclid-rot` | 4/4 | 16 | euclid | Pilot selects (D1 is duplicate of euclid-7-16) |
| E1 | `buleria-12` | 12/8 | 12 | euclid | Pilot selects |
| F1 | `afrobeat-hihat-dense-16` | 4/4 | 16 | euclid | Pilot selects |
| G1 | `gnawa-guembri-12` | 12/8 | 12 | euclid | Pilot selects |
| H1 | `cumbia-euclid-16` | 4/4 | 16 | euclid | Pilot selects |
| I1 | `bossa-tamborim-16` | 4/4 | 16 | struct | Pilot selects |
| J1 | `soca-calypso-16` | 4/4 | 16 | struct | Pilot selects |
| K1 | `guaguanco-euclid-8` | 4/4 | 8 | euclid | Pilot selects |
| L1 | `aksak-9-sparse` | 9/8 | 9 | euclid | Recommended (fills family gap) |
| M1 | `waltz-6-sparse` | 3/4 | 6 | euclid | Recommended (demonstrates 3/4 non-4-step) |
| N1 | `euclid-6-16` | 4/4 | 16 | euclid | Recommended (fills E(5,16)–E(7,16) gap) |
| O1 | `aksak-11-sparse` | 11/8 | 11 | euclid | Pilot selects |
| P1 | `afrobeat-12-even` | 12/8 | 12 | euclid | Pilot selects |
| Q1 | `cumbia-tambor-16` | 4/4 | 16 | struct | Pilot selects |

**Conflict flag:** Candidate D1 (`baladi-euclid-16`, E(7,16,0)) is a duplicate of the existing `euclid-7-16` entry. D1-alt (`baladi-euclid-rot`, E(7,16,4)) has binary `0101001010101001` — distinct. Pilot should choose between skipping Middle-Eastern entirely, using D1-alt, or pairing with another candidate.

**Meter note on cueca:** The phase spec says "cueca chilena (3/4)" but cueca is formally 6/8. Both A1 and A2 are proposed with `meter: '6/8'`. If the Pilot wants `meter: '3/4'`, use A2-alt below:

> **A2-alt (3/4, 6-step struct):** `cueca-chilena-3-4`, meter `3/4`, steps 6, binary `101001` (onsets at 0,2,5), struct — the same syncopated feel in a 3/4 frame. This maps more directly to the spec's "cueca chilena (3/4)" wording.

**Minimum to reach 45:** Select any 14 of the 18 distinct non-duplicate candidates (A1, A2/A2-alt, B1, C1, D1-alt, E1, F1, G1, H1, I1, J1, K1, L1, M1, N1, O1, P1, Q1).

---

## §3 — Prompt Constraint Analysis

### 3.1 SYSTEM_PROMPT — exact constraint lines

**File:** `src/agent/agent.ts`, lines 125–133 (within the RESTRICCIONES block)

```
RESTRICCIONES (obligatorio, la interfaz solo admite esto):
- sound ∈ {bd, sd, hh, oh, cp, rim, lt, mt, ht}
- Cada capa usa "steps" (EXACTAMENTE 16 enteros 0/1) Ó "euclid" {k:1..16, n:2..16, rot:0..n-1}. No ambos.
- mode ∈ {major, minor, dorian, phrygian, lydian, mixolydian, locrian, harmonic:minor}
- quality ∈ {maj, min, dim, aug}
- root: nota como "C", "C#", "Eb", "F#"… ; octave 2..5
- Compón pensando en voice-leadings pequeños entre acordes (la app está organizada por la geometría de acordes).
- Detecta la intención: si solo piden ritmo → solo "rhythm"; si solo armonía → solo "harmony"; si ambos → las dos claves.
- NADA fuera del bloque json (sin texto antes ni después).
```

**What is stated:** `steps` must be EXACTLY 16 integers 0/1 OR `euclid` with bounds. This covers the 16-step constraint in `steps` form and euclid parameters.

**What is missing:**
- No explicit statement that `steps[]` arrays of 12, 6, or 3 elements are forbidden.
- No example of what to do for 3/4 or 12/8 meters.
- No statement that `euclid` with `n < 16` is the correct path for non-4/4 patterns.
- No improvisation fallback section.

### 3.2 SYSTEM_PROMPT_EVOLUTION — exact constraint lines

**File:** `src/agent/agent.ts`, lines 272–278 (within RESTRICCIONES ABSOLUTAS block)

```
══════════ RESTRICCIONES ABSOLUTAS ══════════
- NUNCA incluyas el campo "saveAsBlock" en tu respuesta. El piloto automático NO guarda bloques.
- Responde EXCLUSIVAMENTE con UN bloque `json siguiendo el mismo esquema que el estado de entrada.
- sound ∈ {bd, sd, hh, oh, cp, rim, lt, mt, ht}
- quality ∈ {maj, min, dim, aug}
- Cada capa usa "steps" (EXACTAMENTE 16 enteros 0/1) Ó "euclid" {k:1..16, n:2..16, rot:0..n-1}. No ambos.
- CRÍTICO: "euclid" DEBE ser SIEMPRE un objeto JSON {"k": número, "n": número, "rot": número}. NUNCA una cadena. INCORRECTO: "euclid": "3,8,2". CORRECTO: "euclid": {"k": 3, "n": 8, "rot": 2}.
- NADA fuera del bloque json (sin texto antes ni después, sin "saveAsBlock").
```

**What is stated:** Same 16-step `steps` constraint plus the critical euclid-must-be-object guard (added in Phase 01). The 16-step constraint applies identically.

**What is missing:**
- Same gaps as SYSTEM_PROMPT: no 3/4/12/8 prohibition on `steps[]`, no concrete example.
- No improvisation fallback section.

### 3.3 Gap summary

| Gap | SYSTEM_PROMPT | SYSTEM_PROMPT_EVOLUTION |
|-----|--------------|------------------------|
| `steps[]` = exactly 16 stated | YES (line 127) | YES (line 277) |
| Explicit ban on `steps[12]`, `steps[6]`, `steps[3]` | NO | NO |
| Example of correct 3/4 using `euclid` | NO | NO |
| `euclid` with `n < 16` is the right path for non-4/4 | Implied but not stated | Implied but not stated |
| Improvisation fallback section | NO | NO |

### 3.4 Proposed addition — constraint strengthening text (Spanish, per ADR 0017 D7)

Insert immediately after the current `Cada capa usa "steps"...` line in both prompts:

```
  IMPORTANTE PARA COMPASES NO-4/4: Si el patrón es de 3/4, 6/8 ó 12/8, NUNCA uses "steps" con
  12, 6 ó 3 elementos — siempre usa "euclid" con n = 4, 6 ó 12 (el valor de n expresa los pasos
  nativos del compás, no el valor 16). Ejemplo correcto para 3/4 (tres corcheas por compás):
  { "sound": "hh", "euclid": { "k": 3, "n": 4, "rot": 0 } }   ← E(3,4) en 3/4, NO steps[3].
  Ejemplo incorrecto: { "sound": "hh", "steps": [1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0] }  ← usar steps[16] con
  ceros de relleno solo si el compás es 4/4 nativo.
```

---

## §4 — Open Decision OD-2: Prompt Structure for Improvisation Fallback

### Option A — Consolidated trailing section

Add a new `══════════ IMPROVISACIÓN INFORMADA (cuando no hay receta disponible) ══════════` section at the very end of both prompts, after all existing sections (after RESTRICCIONES ABSOLUTAS in SYSTEM_PROMPT_EVOLUTION; after the MODO CÓDIGO section in SYSTEM_PROMPT).

**Placement in SYSTEM_PROMPT:** After the final line of the MODO CÓDIGO block.

**Placement in SYSTEM_PROMPT_EVOLUTION:** After the EJEMPLO CONCRETO (antes → después) block (the current last section).

**Advantages:**
- Clean separation from constraint logic — LLM reads constraints first, then fallback instructions.
- Easy to locate, update, and diff in code review.
- Does not disrupt existing skill or restriction sections.
- Mirrors the existing section pattern (`══════════ SECTION ══════════` headers).
- LLM context: sections at the end of system prompts tend to be in working memory during generation.

**Disadvantages:**
- Slightly separated from the skills preamble (though this is acceptable — fallback is a different concern from constraints).
- No co-location with the 16-step constraint it relates to (though the constraint strengthening in §3.4 is added inline regardless).

**No ADR required for Option A:** It is purely additive — a new section appended, no existing text removed or restructured.

### Option B — Inline in restrictions block

Expand the RESTRICCIONES / RESTRICCIONES ABSOLUTAS block to include improvisation guidance directly after the 16-step constraint addition.

**Placement:** Immediately after the new constraint-strengthening text from §3.4.

**Advantages:**
- Co-located with the 16-step constraint and schema format rules — the LLM reads format rules and fallback in one pass.
- Makes the connection between "here are the rules" and "here is what to do when you don't know a recipe" explicit.

**Disadvantages:**
- Lengthens the restrictions block, mixing two distinct concerns (format constraints vs. musical reasoning guidance).
- Restrictions blocks tend to be "don't do X" — adding "do Y when Z" changes the semantic register.
- Harder to scan: a developer reading the restrictions block has to parse musical reasoning instructions alongside format constraints.

### Recommendation

**Option A** (consolidated trailing section). Rationale: the improvisation fallback is a capability instruction (positive guidance on what to generate and how to think), not a constraint (negative prohibition). Mixing them in the restrictions block violates the single-responsibility of that block. A dedicated section at the end is discoverable, easy to maintain, and follows the established pattern of the prompt's existing sections.

**ADR trigger assessment:** No ADR needed. Option A is purely additive — no existing prompt structure is removed or reorganized. Document the choice in the handoff per the phase spec's "no ADR if purely additive" rule (phase-05.md §ADR Triggers).

### Content of the improvisation fallback section (both prompts)

The following Spanish text will be added (per ADR 0017 D7):

**SYSTEM_PROMPT version:**

```
══════════ IMPROVISACIÓN INFORMADA (cuando no hay receta disponible) ══════════

Cuando el usuario pida un estilo o tradición musical que no encaje directamente en
ninguna receta del catálogo, puedes generar un patrón musical informado usando tu
propio conocimiento. Sigue estas sub-instrucciones:

A. RAZONA PRIMERO (internamente): antes de generar, considera las características
   culturales y musicales del estilo solicitado: células rítmicas características,
   compás típico, instrumentación, energía, tempo habitual.

B. GENERA CON FORMATOS VÁLIDOS: usa siempre "steps" (exactamente 16 enteros 0/1)
   o "euclid" {k:1..16, n:2..16, rot:0..n-1}. Nunca inventes nuevos campos.

C. INCLUYE musicalIntent.explanation (máx. 300 caracteres) describiendo qué
   características consultaste y por qué el patrón generado refleja ese estilo.

D. PRECISIÓN CULTURAL: describe los patrones como "inspirado en [estilo]" o "con
   características de [tradición]" — nunca afirmes que el patrón generado "es"
   definitivamente el patrón auténtico de esa tradición.

Ejemplo — usuario pide "algo que suene a kpanlogo ghanés":
```json
{
  "rhythm": {
    "layers": [
      { "sound": "bd", "euclid": { "k": 3, "n": 8, "rot": 0 } },
      { "sound": "hh", "euclid": { "k": 7, "n": 12, "rot": 0 } }
    ]
  },
  "musicalIntent": {
    "style": "kpanlogo-inspired",
    "explanation": "Inspirado en el kpanlogo ghanés: tresillo en bajo (E(3,8)), campana bell E(7,12) en 12/8."
  }
}
```
```

**SYSTEM_PROMPT_EVOLUTION version:** A shorter variant scoped to the autopilot context:

```
══════════ IMPROVISACIÓN INFORMADA (evolución sin receta disponible) ══════════

Si el estado actual no encaja claramente con ninguna receta de "availableRecipes",
puedes generar una evolución culturalmente informada:

A. Razona sobre las características rítmicas/armónicas del estado recibido (estilo
   implícito, metro, densidad, tensión).

B. Genera una variación pequeña y coherente usando solo formatos válidos (steps[16]
   o euclid). No crees patrones completamente nuevos — evoluciónalo.

C. Incluye musicalIntent.explanation (máx. 300 caracteres) describiendo el razonamiento.

D. Usa "inspirado en [estilo]" — no afirmes autoría cultural definitiva.
```

---

## §5 — i18n Impact

**Conclusion: no new user-facing UI strings required.**

Rationale:

1. **Catalog entries** (`RHYTHM_CATALOG` additions): the `id`, `name`, `family`, `traditions`, `meter`, `roles`, `binary`, `onsets`, `mini`, `strudelStrategy`, `euclid` fields are pure data in TypeScript — not rendered directly as UI labels. No `Dictionary` keys needed.

2. **Prompt text changes** (`SYSTEM_PROMPT`, `SYSTEM_PROMPT_EVOLUTION`): these are string constants consumed by the LLM API, not rendered in the browser UI. No `Dictionary` keys needed.

3. **`musicalIntent.explanation` field**: this is LLM-generated free text, already wired through the existing recipe card (`agent.recipeCard.explanationLabel` in `es.ts` line 224). The field exists in `MusicalIntentSchema` (schema v6, ADR 0023). No new schema or i18n changes needed.

4. **New recipe entries** (`RHYTHM_HARMONY_RECIPES` additions): `agentInstruction` is a string used by the recipe engine but not displayed directly as a UI label. `name` and `userIntents` are also not UI keys. No `Dictionary` changes needed.

5. **`types.ts` changes**: not required. The `Dictionary` type is stable. No `agent.recipeCard.*` subkeys are being added.

**i18n files confirmed unchanged:** `src/i18n/types.ts` and `src/i18n/locales/es.ts` require no modifications in this phase.

---

## §6 — Recipe Candidates

Three new recipes are proposed below, referencing new catalog entries from OD-1. Exact content depends on OD-1 Pilot resolution; these proposals use the recommended entries L1, M1, N1, E1, G1, B1.

**Note on harmonyId fields:** All proposed harmonyIds reference entries assumed to exist in `HARMONY_CATALOG`. The exact available harmony catalog ids must be verified in step 05.4 (`src/core/music-knowledge/harmony-catalog.ts` not read in this inventory step). If a suitable harmony entry does not exist, step 05.4 will document the gap and propose using the closest approximation.

---

### Recipe R1 — Bulería Flamenco Modal (12/8)

Uses entry E1 (`buleria-12`, 12/8, euclid E(7,12,5)) and the existing 12/8 bell pattern for layering, over a Phrygian harmony (if available in harmony catalog).

| Field | Value |
|-------|-------|
| id | `flamenco-buleria-phrygian` |
| name | Flamenco Bulería — Phrygian Modal |
| rhythmIds | `['buleria-12']` |
| harmonyId | TBD (Phrygian/Spanish-flavored harmony — check harmony catalog in step 05.4) |
| bpmRange | `[80, 160]` |
| meter | `12/8` |
| density | `dense` |
| userIntents | `['flamenco', 'bulería', 'flamenco groove', 'spanish rhythm', 'buleria flamenco', 'flamenco dance rhythm', 'andalusian groove']` |
| agentInstruction | Use the bulería-inspired 7-onset 12/8 pattern (E(7,12,rot=5)) over a Phrygian modal harmony. The asymmetric accent pattern at rotation 5 evokes the characteristic "rasgueado" attack feel. Suggested tempo: 100–140 BPM. |

---

### Recipe R2 — Cueca Chilena Waltz (3/4 or 6/8)

Uses new entry A2/A2-alt (cueca-chilena, 3/4 or 6/8, struct) with a major or lydian harmony.

| Field | Value |
|-------|-------|
| id | `cueca-chilena-waltz` |
| name | Cueca Chilena — Chilean Folk Waltz |
| rhythmIds | `['cueca-chilena-zapateado']` (or `'cueca-chilena-3-4'` depending on Pilot's OD-1 meter choice) |
| harmonyId | TBD (major/waltz harmony — check harmony catalog in step 05.4) |
| bpmRange | `[100, 160]` |
| meter | `6/8` (or `3/4` depending on OD-1 resolution) |
| density | `medium` |
| userIntents | `['cueca', 'cueca chilena', 'chilean folk', 'chilean waltz', 'latin waltz', 'zapateado', 'folk latin 3/4']` |
| agentInstruction | Apply the cueca-chilena zapateado pattern (5 onsets in 12 steps, characteristic off-beat at step 7) over a major chord loop. The syncopated 6/8 feel evokes Chilean folk music's dance character. Suggested tempo: 120–140 BPM. |

---

### Recipe R3 — Gnawa Trance Groove (12/8)

Uses new entry G1 (`gnawa-guembri-12`, 12/8, euclid E(5,12,3)) layered with the existing `sparse-bell-12` for interlocking North-African polyrhythm.

| Field | Value |
|-------|-------|
| id | `gnawa-trance-12` |
| name | Gnawa Guembri — Trance Groove (12/8) |
| rhythmIds | `['gnawa-guembri-12', 'sparse-bell-12']` |
| harmonyId | TBD (modal drone — likely `west-african-modal-drone` or a new Gnawa-appropriate entry) |
| bpmRange | `[55, 100]` |
| meter | `12/8` |
| density | `sparse` |
| userIntents | `['gnawa', 'gnawa trance', 'north african groove', 'trance groove 12/8', 'moroccan trance', 'guembri', 'lila trance', 'hypnotic 12/8']` |
| agentInstruction | Layer guembri bass (E(5,12,rot=3) — interlocking 5-onset pattern) with sparse bell (E(5,12)) in 12/8 over a modal drone. The interlocking patterns create the hypnotic repetition characteristic of Gnawa Lila ceremonies. Suggested tempo: 65–85 BPM. |

---

### Recipe R4 (bonus) — Cumbia Bass Groove (4/4)

Uses new entry H1 (`cumbia-euclid-16`, 4/4, euclid E(6,16,0)) if approved.

| Field | Value |
|-------|-------|
| id | `cumbia-groove-4-4` |
| name | Cumbia Bass Groove — Colombian-Inspired |
| rhythmIds | `['cumbia-euclid-16']` |
| harmonyId | TBD (minor loop — check harmony catalog in step 05.4) |
| bpmRange | `[80, 130]` |
| meter | `4/4` |
| density | `medium` |
| userIntents | `['cumbia', 'colombian groove', 'cumbia bass', 'latin cumbia', 'cumbia rhythm', 'colombian latin', 'cumbia beat']` |
| agentInstruction | Use the E(6,16) bass pattern (6 syncopated hits across 16 steps) as the rhythmic foundation, inspired by Colombian cumbia's driving bass drum feel. Pair with a minor or dorian harmony loop. Suggested tempo: 95–115 BPM. |

---

## §7 — Test Coverage Confirmation

**No new test code is needed.** Existing test infrastructure covers all new entries and recipes automatically:

1. **Rhythm catalog congruence tests** (`tests/music-knowledge/rhythm-catalog.test.ts` or equivalent): the test iterates all entries in `RHYTHM_CATALOG` and verifies five invariants for each entry:
   - `binary.length === steps`
   - `onsets` are exactly the 0-based indices where `binary[i] === '1'`
   - `mini` has exactly `steps` space-separated tokens
   - `strudelStrategy === 'euclid'` iff `euclid` field present
   - When `euclid` present: `rotate(bjorklund(k, n), rot).join('') === binary`

   New entries in `RHYTHM_CATALOG` are automatically included in iteration. No manual test additions needed for new entries.

2. **Recipe referential integrity tests** (`tests/music-knowledge/recipes.test.ts`): iterates all entries in `RHYTHM_HARMONY_RECIPES` and verifies:
   - Every `rhythmIds[i]` resolves to an existing id in `RHYTHM_CATALOG`
   - `harmonyId` resolves to an existing id in `HARMONY_CATALOG`
   - All recipe `id`s are unique
   - `userIntents.length >= 1`
   - `40 ≤ bpmRange[0] ≤ bpmRange[1] ≤ 240`
   - `meter` equals the `meter` field of every referenced rhythm entry

   New recipes in `RHYTHM_HARMONY_RECIPES` are automatically included. No manual test additions needed.

3. **Schema change confirmation:** No changes to `schema.ts` are needed. `SCHEMA_VERSION` stays 6. `musicalIntent.explanation` already exists in `MusicalIntentSchema` (Phase 03 ai-jam). No new Zod validators needed.

4. **A-05-06 quality gate (`tsc --noEmit`, lint, test, build):** purely a quality gate, not a schema bump. Covered by the full quality gate in step 05.4.

---

## §8 — Open Decisions Summary

| ID | Decision | Options | Pilot must resolve before |
|----|----------|---------|--------------------------|
| **OD-1** | Which rhythm entries to add (≥14 of 18 candidates A1–Q1) | Select any ≥14 from the candidate table in §2; confirm meter for cueca ('6/8' vs '3/4'); confirm whether D1 (baladi-rot) or an alternative fills the Middle-Eastern slot | Step 05.2 |
| **OD-2** | Prompt structure for improvisation fallback | Option A (trailing section — recommended) or Option B (inline in restrictions) | Step 05.3 |

**ADR trigger:** Per phase-05.md §ADR Triggers, no ADR is required if the Pilot chooses Option A (purely additive). If Option B is chosen and involves restructuring existing restriction blocks, the Dev will open an ADR before step 05.3.
