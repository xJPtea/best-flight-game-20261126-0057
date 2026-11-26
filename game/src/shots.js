// Skyline Courier — reproducible screenshots. A `?shot=` query puts the
// game into a fixed, deterministic scene so a screenshot taken in headless
// Chrome shows the same frame every time. Seeds come from `?seed=` so the
// terrain, rings and clouds are stable too.
//
//   ?shot=start   title card over the attract demo, plane mid-flight
//   ?shot=flight  chase view, ring ahead, runway behind, full HUD
//   ?shot=boss    the Storm Carrier fight, boss and HP bar in frame
//   ?shot=victory mission complete panel over the hangar upgrade screen
//
// In shot mode the game pre-runs a fixed number of simulation steps on
// load and then freezes, so the captured frame is the composed one.

import { buildWorld } from './world.js';
import { createBoss } from './boss.js';
import { MISSIONS } from './config.js';

export function shotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot'),
    seed: Number(q.get('seed') || '1'),
  };
}

export function isShotMode() {
  return shotParams().shot !== null;
}

// Configure a fresh game state for the requested shot. Called by main.js
// right after the state is created, before the first frame.
export function applyShot(game, shot, seed) {
  const world = game.world;
  const plane = game.plane;

  if (shot === 'start') {
    // Attract demo over the harbour, plane already climbing through ring 1.
    game.mode = 'attract';
    plane.x = 2100;
    plane.alt = 430;
    plane.speed = 62;
    plane.heading = 90;
    plane.throttle = 0.7;
    world.rings[0].passed = false;
    return { preSteps: 90 };
  }

  if (shot === 'flight') {
    // Just after takeoff: runway still in frame behind, first ring ahead.
    game.mode = 'fly';
    game.attract = false;
    plane.x = 950;
    plane.alt = 300;
    plane.speed = 68;
    plane.heading = 88;
    plane.throttle = 0.85;
    plane.pitchVisual = 0.12;
    plane.fuel = 88;
    game.score = 150;
    return { preSteps: 30 };
  }

  if (shot === 'boss') {
    // Final mission, carrier close ahead, one ring passed, flak in the air.
    const bossWorld = buildWorld(4);
    game.world = bossWorld;
    game.missionIndex = 4;
    game.timeLeft = 132;
    for (const ring of bossWorld.rings) ring.passed = true; // cleared to reach the carrier
    game.boss = createBoss(bossWorld.bossX - 2600, bossWorld.bossY);
    game.boss.hp = 62;
    game.timeLeft = 132;
    game.boss.flak.push(
      { x: game.boss.x - 200, y: 380, vx: -160, vy: 40, life: 4 },
      { x: game.boss.x - 420, y: 500, vx: -180, vy: -30, life: 4 },
    );
    game.mode = 'fly';
    game.attract = false;
    plane.x = game.boss.x - 1200;
    plane.alt = 460;
    plane.speed = 78;
    plane.heading = 92;
    plane.throttle = 0.9;
    plane.fuel = 64;
    plane.hull = 72;
    game.score = 1240;
    game.shots.push({ x: plane.x + 260, y: plane.alt + 6, vx: 520, vy: -8, life: 0.8 });
    game.shots.push({ x: plane.x + 180, y: plane.alt - 4, vx: 520, vy: 4, life: 0.8 });
    return { preSteps: 45 };
  }

  if (shot === 'victory') {
    // Mission complete: every ring passed, carrier down, shop panel up.
    game.mode = 'shop';
    game.attract = false;
    game.shop.credits = 940;
    game.shopMessage = 'Storm Carrier destroyed — the skies are yours, courier.';
    for (const ring of world.rings) ring.passed = true;
    plane.x = 4200;
    plane.alt = 380;
    plane.speed = 40;
    plane.heading = 90;
    plane.throttle = 0.3;
    game.score = 1860;
    game.lastReward = 420;
    game.lastRings = world.rings.length;
    game.lastTimeBonus = 120;
    game.victoryLine = 'All rings threaded. The Storm Carrier is down.';
    game.campaignDone = true;
    return { preSteps: 20 };
  }

  return { preSteps: 0 };
}

// The seed a shot uses for its world. Kept separate from the mission seed
// so a screenshot seed never changes the missions a player flies.
export function shotSeed(seed) {
  return seed * 7919 + 13;
}

export { MISSIONS };
