# Skyline Courier — Rings, Upgrades & the Storm Carrier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/xJPtea/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/xJPtea/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete, original 2D flight game that plays offline in a desktop browser from static files. Built for the [best-flight-game bounty](https://make.fun/bounty/best-flight-game-20261126-0057) on make.fun.

## The game

You are a courier pilot flying the dusk coast. Thread the glowing rings, earn credits, spend them in the hangar, and bring down the Storm Carrier.

- **Chase view over recognisable terrain** — procedural coastline, islands, mountains, a runway, and a dusk sky with a low sun. The aircraft is always in frame, with lit instruments: altitude and speed tapes, an artificial horizon, a compass strip, and a HUD with altitude, speed, heading, fuel, hull, score and credits.
- **Mission chain (progression 1)** — 5 sorties with different goals: Harbour Run, Island Hop, Mountain Pass, Storm Front, and the Storm Carrier finale. Each has its own ring course, time limit, altitude band and wind.
- **Upgrade shop (progression 2)** — credits from rings and deliveries buy engine, hull and fuel tiers between missions.
- **Boss** — the Storm Carrier airship: three flak turrets, a glowing weak-point core, and an HP bar. Destroy it to finish the campaign.
- **Fuel and damage turn a sortie into decisions** — throttle discipline matters, rings refuel you a little, flak and hard ground arrivals hurt.
- **Autoplay from the first frame** — an autopilot demo flies the rings while the title card shows. Press any key to take the stick. No "press enter" gate.
- **Sound** — everything is synthesized live with WebAudio: engine hum, ring chimes, cannon fire, explosions, mission fanfare. No audio files.
- **Offline** — every file the game loads sits under `game/`. No network request.

## Controls

| Input | Action |
| --- | --- |
| W / S or ↑ / ↓ | Pitch up / down |
| A / D or ← / → | Bank (changes heading) |
| Shift / Ctrl | Throttle up / down |
| Space or mouse click | Fire (and steer toward the cursor while held) |
| Enter | Launch / continue |
| 1 / 2 / 3 | Buy upgrade in the hangar |
| M / P | Mute / pause |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

The four screenshots in `screenshots/` are real renders of this game's own code, taken in headless Chrome. Each one maps to a reproducible scene in `shots.json` (`?shot=start|flight|boss|victory`, deterministic seed):

1. `1-flight.jpg` — chase view, ring ahead, runway behind, full HUD
2. `2-start.jpg` — attract demo under the title card
3. `3-boss.jpg` — the Storm Carrier fight
4. `4-victory.jpg` — mission complete, hangar upgrade shop

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-game.ts`.

## Layout

- `game/index.html` — the page
- `game/src/main.js` — game loop, physics, mission flow
- `game/src/config.js` — tuning, missions, upgrades, palette
- `game/src/world.js` — seeded terrain, rings, clouds, runway
- `game/src/render.js` — all canvas drawing and HUD
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized WebAudio sound
- `game/src/autopilot.js` — attract-mode pilot
- `game/src/boss.js` — the Storm Carrier
- `game/src/upgrades.js` — shop rules
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/save.js` — localStorage progress
- `main.ts` — the hand-in program
- `serve.ts` — local static server for play-testing
