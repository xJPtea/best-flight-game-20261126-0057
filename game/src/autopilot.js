// Skyline Courier — autopilot. In attract mode the plane flies itself:
// it chases the next ring, holds a sensible throttle, and fires at the
// boss core when one is in range. The same module also steadies the plane
// for a few seconds after the player takes over, so the handover is smooth.

import { bossCore } from './boss.js';

// Decide one frame of control. Returns { pitch, throttle, fire } where
// pitch is -1 (down) .. 1 (up) and throttle is 0..1.
export function autopilotControl(plane, world, boss) {
  // Boss first: if the carrier is close, aim for its core and shoot.
  if (boss && !boss.dead) {
    const core = bossCore(boss);
    const dx = core.x - plane.x;
    if (dx < 900 && dx > -100) {
      const dy = core.y - plane.alt;
      return {
        pitch: clamp(dy / 220, -1, 1),
        throttle: 0.55,
        fire: dx < 620,
      };
    }
  }

  const ring = world.rings.find((r) => !r.passed);
  if (!ring) return { pitch: 0, throttle: 0.4, fire: false };

  const dx = ring.x - plane.x;
  const dy = ring.y - plane.alt;
  // Ease off as the ring gets close, so the plane threads it, not overshoots.
  const pitch = clamp(dy / 180, -1, 1);
  const throttle = dx > 500 ? 0.85 : 0.55;
  return { pitch, throttle, fire: false };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
