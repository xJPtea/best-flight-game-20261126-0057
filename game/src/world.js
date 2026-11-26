// Skyline Courier — world building: seeded random numbers, procedural
// terrain height, ring courses, clouds and the runway strip. Nothing here
// draws; it only answers questions about the world.

import { MISSIONS } from './config.js';

// A small deterministic generator so a seed always rebuilds the same
// coastline, the same rings and the same clouds.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise: a few sines hashed from the seed give rolling hills
// without any stored heightmap.
function ridgeAt(x, seed) {
  const s = seed * 0.731;
  const a = Math.sin(x * 0.00042 + s) * 0.55;
  const b = Math.sin(x * 0.0011 + s * 2.7) * 0.3;
  const c = Math.sin(x * 0.0029 + s * 5.1) * 0.15;
  return a + b + c;
}

// Terrain height in metres at world x. The first stretch is the runway
// flats, then sand, then green hills, then rock peaks far east.
export function terrainHeightAt(x, seed) {
  if (x < 900) return 6; // runway flats
  const t = (x - 900) / 2600;
  const ridge = ridgeAt(x, seed);
  if (t < 0.25) return 6 + t * 40 + Math.max(0, ridge) * 30; // beach
  if (t < 0.6) return 40 + ridge * 120 + 60; // rolling green hills
  return 120 + Math.max(0, ridge) * 320; // mountain country
}

// What the ground looks like at x: sea, sand, grass or rock. The renderer
// paints bands from this.
export function groundKindAt(x, seed) {
  if (x < 900) return 'runway';
  const t = (x - 900) / 2600;
  const h = terrainHeightAt(x, seed);
  if (t < 0.25) return h < 12 ? 'sand' : 'grass';
  if (h > 320) return 'rock';
  return 'grass';
}

// The runway: a flat strip the plane starts on in mission 1.
export function runway() {
  return { x0: 60, x1: 860, y: 6 };
}

// Ring course for a mission. Rings sit ahead of the plane, spaced along x,
// at altitudes inside the mission band, so each ring is reachable from the
// previous one without a crazy climb.
export function buildRings(mission) {
  const rng = makeRng(mission.seed);
  const rings = [];
  let x = 1500;
  let alt = 420;
  const [low, high] = mission.band;
  for (let i = 0; i < mission.rings; i++) {
    const span = high - low;
    const target = low + span * (0.25 + rng() * 0.5);
    // Ease toward the target so the course flows instead of jumping.
    alt = alt + (target - alt) * 0.6;
    rings.push({
      index: i,
      x,
      y: Math.round(alt),
      radius: 55,
      passed: false,
      flash: 0,
    });
    x += 1500 + rng() * 700;
    alt = target;
  }
  return rings;
}

// Drifting clouds for the sky layer. Positions wrap around the camera.
export function buildClouds(seed, count) {
  const rng = makeRng(seed + 77);
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: rng() * 9000,
      y: 40 + rng() * 260,
      scale: 0.6 + rng() * 1.4,
      speed: 4 + rng() * 8,
    });
  }
  return clouds;
}

// A mission's world bundle: rings, clouds, and the seed that shapes its
// terrain. The boss mission also gets the carrier's starting spot.
export function buildWorld(missionIndex) {
  const mission = MISSIONS[missionIndex];
  const rings = buildRings(mission);
  const clouds = buildClouds(mission.seed, 26);
  const lastRing = rings[rings.length - 1];
  return {
    mission,
    missionIndex,
    rings,
    clouds,
    seed: mission.seed,
    bossX: mission.boss ? lastRing.x + 1900 : 0,
    bossY: 430,
  };
}
