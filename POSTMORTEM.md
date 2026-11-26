# Post-mortem — Skyline Courier (best-flight-game-20261126-0057)

Built 26 Nov 2026, one session, for the $500 best-flight-game bounty.
Deadline Fri 28 Nov 2026 07:57 WIB; blind round 1 cutoff 19:57 WIB 26 Nov.

## What worked

- Autoplay from the first frame: the attract autopilot takes off, climbs and
  threads rings with no input. Verified live over CDP in real time: 45 s in,
  ring 1/4 passed, score 100, altitude 459 m, speed 53 m/s, fuel 87.
- All four screenshots are real renders of the game's own code in headless
  Chrome, viewed directly, and each shows what the judge's first criterion
  asks for: chase view, aircraft in frame, lit instruments, ring ahead,
  runway (cover), boss with HP bar, and the upgrade shop.
- Deterministic `?shot=` scenes (`start|flight|boss|victory`, seed 1) make
  every screenshot reproducible; `shots.json` maps file to query.
- `main.ts` hand-in verified: `MAKEFUN_OUTPUT_DIR=out node main.ts` writes
  dossier.json (486,207 bytes, schema makefun/dossier/v1); game/ is 63,076
  bytes; all four screenshots under 256 KiB; no console errors.
- Two progression systems (5-mission ring chain, 3-line upgrade shop) plus
  the Storm Carrier boss with turrets, flak and a weak-point core.

## What failed, and the fix

- First boss screenshot: the carrier was drawn off-screen. `drawBoss` used
  raw world metres for screen x instead of multiplying by the 0.55 px/m
  scale. Fixed in `boss.js` (same for flak), re-shot, carrier now fills the
  frame with turrets, core and HP bar.
- First boss HP bar overlapped the HUD hull bar and timer. Moved it below
  the HUD (y 106–146).
- First title card: the two long lines overflowed the 680 px panel. Widened
  the panel to 860 px and split the text into three short lines.
- First attract screenshots under `--virtual-time-budget` showed the plane
  still on the runway after "30 s" — a headless virtual-time artifact, not a
  game bug. Real-time CDP driving proved the loop runs and the plane takes
  off. Lesson: verify gameplay in real time, not virtual time.
- Altitude tape showed negative feet near the ground. Clamped at 0.
- Compass strip overlapped the controls hint. Moved the strip up to y 660.

## Skills to improve

- Procedural terrain reads flat at the runway end: the height function needs
  more relief in the first 2 km so the coastline reads from the cover shot.
- The boss smoke puffs render as flat dark discs; they need soft edges.
- The plane could be bigger in frame; it was scaled 1.25x after the first
  look, and a second pass on silhouette vs. the sky would help.
- Test harness: a reusable CDP driver (`/tmp/cdp-test.mjs`) now exists for
  real-time play-tests; keep it for the next game entry.

## Verification numbers

- Dossier: 486,207 bytes; game/: 63,076 bytes; screenshots: 60,781 /
  79,069 / 74,564 / 100,261 bytes (all ≤ 256 KiB, 1280×720).
- Syntax: `node --check` clean on all 11 game sources.
- Console: no errors on the flight shot load.
- Attract soak (real time, CDP): 45 s → score 100, rings 1/4, no crash.
