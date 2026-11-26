// Skyline Courier — the Storm Carrier, the airship boss of the final
// mission. It drifts across the sky, its turrets spit flak at the plane,
// and its glowing core is the weak point. This file owns the boss state,
// its update step and its drawing.

import { PALETTE } from './config.js';

export function createBoss(x, y) {
  return {
    x,
    y,
    hp: 100,
    maxHp: 100,
    speed: 6, // slow drift west, toward the plane
    bobPhase: 0,
    turrets: [
      { dx: -260, dy: 26, cooldown: 1.2 },
      { dx: 60, dy: 34, cooldown: 2.1 },
      { dx: 300, dy: 20, cooldown: 1.7 },
    ],
    flak: [], // enemy projectiles in world space
    coreFlash: 0, // lights up when the core is hit
    smoke: 0, // grows as hp falls
    dead: false,
    deathTimer: 0,
  };
}

export function bossCore(boss) {
  return { x: boss.x + 30, y: boss.y + 8, r: 26 };
}

// One update step. `plane` is the live plane state; `onFlak` is called for
// each new flak burst so main.js can route damage. Returns nothing.
export function updateBoss(boss, dt, plane, onFlak) {
  if (boss.dead) {
    boss.deathTimer += dt;
    boss.y += 22 * dt; // the wreck sinks
    return;
  }
  boss.bobPhase += dt;
  boss.x -= boss.speed * dt;
  boss.y += Math.sin(boss.bobPhase * 0.7) * 6 * dt;
  if (boss.coreFlash > 0) boss.coreFlash -= dt;
  boss.smoke = 1 - boss.hp / boss.maxHp;

  for (const turret of boss.turrets) {
    turret.cooldown -= dt;
    if (turret.cooldown > 0) continue;
    // Fire only while the plane is in range and ahead of the ship.
    const dx = plane.x - (boss.x + turret.dx);
    const dy = plane.alt - (boss.y + turret.dy);
    const dist = Math.hypot(dx, dy);
    if (dist < 1500) {
      const speed = 260;
      boss.flak.push({
        x: boss.x + turret.dx,
        y: boss.y + turret.dy,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        life: 5,
      });
      onFlak();
    }
    turret.cooldown = 1.6 + Math.random() * 1.4;
  }

  for (const shot of boss.flak) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
  }
  boss.flak = boss.flak.filter((s) => s.life > 0);
}

// Damage the core. Returns true when the hit killed the carrier.
export function hitBossCore(boss, damage) {
  if (boss.dead) return false;
  boss.hp -= damage;
  boss.coreFlash = 0.25;
  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.dead = true;
    boss.deathTimer = 0;
    return true;
  }
  return false;
}

// Draw the carrier in world space. The caller has already translated the
// canvas so world x maps to screen x and altitude maps to screen y.
export function drawBoss(ctx, boss, camX, toScreenY) {
  const sx = (boss.x - camX) * 0.55;
  const sy = toScreenY(boss.y);
  const wobble = Math.sin(boss.bobPhase * 0.7) * 4;

  ctx.save();
  ctx.translate(sx, sy + wobble);

  // Main envelope: a long grey hull with red storm stripes.
  ctx.fillStyle = PALETTE.bossHull;
  ctx.beginPath();
  ctx.ellipse(0, 0, 380, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2f38';
  ctx.beginPath();
  ctx.ellipse(0, 26, 340, 34, 0, 0, Math.PI);
  ctx.fill();

  // Storm stripes along the hull.
  ctx.fillStyle = PALETTE.bossAccent;
  ctx.fillRect(-330, -8, 660, 10);
  ctx.fillRect(-300, 34, 600, 6);

  // Nose fins and tail fins.
  ctx.fillStyle = '#31353f';
  ctx.beginPath();
  ctx.moveTo(330, -10);
  ctx.lineTo(400, -52);
  ctx.lineTo(392, 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-330, -6);
  ctx.lineTo(-398, -46);
  ctx.lineTo(-390, 10);
  ctx.closePath();
  ctx.fill();

  // Gondola under the hull.
  ctx.fillStyle = '#23262e';
  ctx.fillRect(-190, 52, 380, 26);
  ctx.fillStyle = '#ffd23f';
  for (let i = 0; i < 8; i++) ctx.fillRect(-170 + i * 44, 58, 26, 12);

  // Turrets.
  for (const turret of boss.turrets) {
    ctx.fillStyle = '#17191f';
    ctx.beginPath();
    ctx.arc(turret.dx, turret.dy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0c0d10';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(turret.dx, turret.dy);
    ctx.lineTo(turret.dx - 34, turret.dy + 14);
    ctx.stroke();
  }

  // Weak point: the glowing core on the hull's flank.
  const core = bossCore(boss);
  const glow = boss.coreFlash > 0 ? 1 : 0.55 + Math.sin(boss.bobPhase * 4) * 0.2;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = '#ff5d4d';
  ctx.beginPath();
  ctx.arc(core.x - boss.x, core.y - boss.y, core.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Battle smoke as the hull takes damage.
  if (boss.smoke > 0.15) {
    ctx.fillStyle = `rgba(40,40,40,${0.25 + boss.smoke * 0.4})`;
    for (let i = 0; i < 5; i++) {
      const px = -200 + i * 110 + Math.sin(boss.bobPhase * 2 + i) * 12;
      ctx.beginPath();
      ctx.arc(px, -70 - i * 6, 18 + boss.smoke * 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // Flak bursts, drawn as angry red dots with a glow.
  for (const shot of boss.flak) {
    const fx = (shot.x - camX) * 0.55;
    const fy = toScreenY(shot.y);
    ctx.fillStyle = 'rgba(255,80,60,0.35)';
    ctx.beginPath();
    ctx.arc(fx, fy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(fx, fy, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boss HP bar, fixed below the HUD so it never covers the instruments.
  ctx.save();
  const barW = 520;
  const barX = (1280 - barW) / 2;
  ctx.fillStyle = 'rgba(8,20,32,0.72)';
  ctx.fillRect(barX - 10, 106, barW + 20, 40);
  ctx.fillStyle = '#ff3b30';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STORM CARRIER', 1280 / 2, 121);
  ctx.fillStyle = '#3a0d0a';
  ctx.fillRect(barX, 127, barW, 14);
  ctx.fillStyle = boss.hp > 30 ? '#ff5d4d' : '#ffd23f';
  ctx.fillRect(barX, 127, barW * (boss.hp / boss.maxHp), 14);
  ctx.strokeStyle = '#7fd4ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, 127, barW, 14);
  ctx.restore();
}
