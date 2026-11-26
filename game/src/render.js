// Skyline Courier — everything on screen. One render pass per frame:
// dusk sky, sun, clouds, sea and procedural terrain, runway, rings, the
// plane, the boss, then the HUD instruments and the overlay panels. The
// camera follows the plane in both axes so the chase view never fights
// the pilot.

import { PALETTE, VIEW_W, VIEW_H } from './config.js';
import { terrainHeightAt, groundKindAt, runway } from './world.js';
import { drawBoss } from './boss.js';

const PLANE_SCREEN_X = 430;
const SCALE_X = 0.55; // screen pixels per metre, horizontally
const SCALE_Y = 0.5; // screen pixels per metre, vertically

// Camera altitude follows the plane partway, so climbs feel big but the
// plane never leaves the frame.
function camAltOf(planeAlt) {
  return planeAlt * 0.55;
}

function toScreenY(alt, camAlt) {
  return 600 - (alt - camAlt) * SCALE_Y;
}

export function render(ctx, game) {
  const { plane, world } = game;
  const camX = plane.x - PLANE_SCREEN_X / SCALE_X;
  const camAlt = camAltOf(plane.alt);
  const screenY = (alt) => toScreenY(alt, camAlt);

  drawSky(ctx, game, camX);
  drawSeaAndTerrain(ctx, world, camX, screenY);
  drawRunway(ctx, camX, screenY);
  drawRings(ctx, world, camX, screenY, game.time);
  if (game.boss) drawBoss(ctx, game.boss, camX, screenY);
  drawShots(ctx, game, camX, screenY);
  drawPlane(ctx, game, screenY(plane.alt));
  drawHud(ctx, game);
  drawInstruments(ctx, game);
  if (game.mode === 'attract') drawTitleCard(ctx, game);
  if (game.mode === 'brief') drawBriefCard(ctx, game);
  if (game.mode === 'shop') drawShopPanel(ctx, game);
  if (game.mode === 'victory') drawVictoryPanel(ctx, game);
  if (game.mode === 'crashed') drawCrashPanel(ctx, game);
  if (game.mode === 'outoffuel') drawOutOfFuelPanel(ctx, game);
  if (game.message) drawToast(ctx, game);
}

function drawSky(ctx, game, camX) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(0.8, PALETTE.skyLow);
  sky.addColorStop(1, '#2a1f2e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Low sun on the horizon.
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(1010, 470, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,217,138,0.25)';
  ctx.beginPath();
  ctx.arc(1010, 470, 80, 0, Math.PI * 2);
  ctx.fill();

  // Clouds drift with the wind, parallax-slow.
  ctx.fillStyle = PALETTE.cloud;
  for (const cloud of game.world.clouds) {
    const cx = ((cloud.x - camX * 0.25) % 2600 + 2600) % 2600 - 400;
    const cy = cloud.y * 0.7 + 30;
    const s = cloud.scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 44 * s, cy + 6, 46 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 48 * s, cy + 7, 40 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Storm rain for the later missions.
  if (game.world.mission.wind >= 12) {
    ctx.strokeStyle = 'rgba(180,200,220,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const rx = ((i * 137 + game.time * 900) % 1400) - 60;
      const ry = (i * 89 + game.time * 1400) % 720;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 14, ry + 26);
    }
    ctx.stroke();
  }
}

function drawSeaAndTerrain(ctx, world, camX, screenY) {
  // Sea fills everything below the horizon line.
  const horizon = screenY(0);
  const seaGrad = ctx.createLinearGradient(0, horizon, 0, VIEW_H);
  seaGrad.addColorStop(0, PALETTE.sea);
  seaGrad.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, horizon, VIEW_W, VIEW_H - horizon);

  // Sun glitter on the water.
  ctx.fillStyle = 'rgba(255,217,138,0.18)';
  for (let i = 0; i < 24; i++) {
    const gx = 880 + ((i * 53) % 320) - 160;
    const gy = horizon + 12 + ((i * 31) % 90);
    ctx.fillRect(gx, gy, 26 + (i % 3) * 14, 2);
  }

  // Terrain silhouette: sample the height function across the screen and
  // paint the ground in bands by kind (sand, grass, rock, snow caps).
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  const step = 8;
  const kinds = [];
  for (let sx = 0; sx <= VIEW_W; sx += step) {
    const wx = camX + sx / SCALE_X;
    const h = terrainHeightAt(wx, world.seed);
    kinds.push({ sx, h, kind: groundKindAt(wx, world.seed) });
    ctx.lineTo(sx, screenY(h));
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fillStyle = PALETTE.grass;
  ctx.fill();

  // Colour bands: paint the top edge of the silhouette per segment.
  for (const seg of kinds) {
    const y = screenY(seg.h);
    if (seg.kind === 'sand') ctx.fillStyle = PALETTE.sand;
    else if (seg.kind === 'rock') ctx.fillStyle = seg.h > 380 ? PALETTE.snow : PALETTE.rock;
    else if (seg.kind === 'runway') ctx.fillStyle = '#8a8f98';
    else ctx.fillStyle = seg.h > 220 ? PALETTE.hill : PALETTE.grass;
    ctx.fillRect(seg.sx, y, step + 1, VIEW_H - y);
  }
}

function drawRunway(ctx, camX, screenY) {
  const r = runway();
  const x0 = (r.x0 - camX) * SCALE_X;
  const x1 = (r.x1 - camX) * SCALE_X;
  if (x1 < -50 || x0 > VIEW_W + 50) return;
  const y = screenY(r.y);
  ctx.fillStyle = '#3c4048';
  ctx.fillRect(x0, y - 4, x1 - x0, 10);
  ctx.fillStyle = '#f5f5f5';
  for (let x = x0 + 20; x < x1 - 20; x += 70) ctx.fillRect(x, y - 1, 34, 3);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('CORAL RUNWAY', x0 + 8, y - 12);
}

function drawRings(ctx, world, camX, screenY, time) {
  for (const ring of world.rings) {
    const sx = (ring.x - camX) * SCALE_X;
    if (sx < -120 || sx > VIEW_W + 120) continue;
    const sy = screenY(ring.y);
    const r = ring.radius * 0.9;
    const pulse = 1 + Math.sin(time * 3 + ring.index) * 0.05;
    ctx.save();
    ctx.globalAlpha = ring.passed ? 0.25 : 1;
    // Glow halo, then the ring itself, then its number.
    ctx.strokeStyle = PALETTE.ringGlow;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(sx, sy, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ring.passed ? '#7dff9a' : PALETTE.ring;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(sx, sy, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ring.index + 1), sx, sy);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
}

function drawShots(ctx, game, camX, screenY) {
  for (const shot of game.shots) {
    const sx = (shot.x - camX) * SCALE_X;
    const sy = screenY(shot.y);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const flak of game.flakHits) {
    const sx = (flak.x - camX) * SCALE_X;
    const sy = screenY(flak.y);
    ctx.fillStyle = 'rgba(255,93,77,0.8)';
    ctx.beginPath();
    ctx.arc(sx, sy, 7 + flak.age * 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The courier plane, drawn in profile with a bank angle and a lit cockpit.
function drawPlane(ctx, game, planeY) {
  const { plane } = game;
  const bank = ((plane.heading - 90) / 48) * 0.5; // radians of roll
  const pitch = plane.pitchVisual || 0;
  ctx.save();
  ctx.translate(PLANE_SCREEN_X, planeY);
  ctx.rotate(bank * 0.4 + pitch * 0.15);
  ctx.scale(1.25, 1.25);

  // Shadow on the ground below, for height read.
  ctx.restore();
  const groundY = 600;
  const heightAbove = Math.max(0, groundY - planeY);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 0.25 - heightAbove / 1400);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(PLANE_SCREEN_X, groundY + 8, 46, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(PLANE_SCREEN_X, planeY);
  ctx.rotate(bank * 0.4 + pitch * 0.15);

  // Tail fin and stabiliser.
  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.moveTo(-38, -4);
  ctx.lineTo(-52, -26);
  ctx.lineTo(-38, -22);
  ctx.closePath();
  ctx.fill();
  // Far wing (darker, behind the fuselage).
  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(6, -30);
  ctx.lineTo(16, -28);
  ctx.lineTo(14, 4);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.quadraticCurveTo(-20, -14, 22, -8);
  ctx.quadraticCurveTo(52, -4, 56, 2);
  ctx.quadraticCurveTo(30, 10, -10, 10);
  ctx.quadraticCurveTo(-40, 9, -52, 0);
  ctx.fill();
  // Nose stripe and cargo door.
  ctx.fillStyle = '#fff';
  ctx.fillRect(-6, -6, 34, 4);
  ctx.strokeStyle = PALETTE.planeDark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-34, -2, 18, 10);
  // Lit cockpit glass.
  ctx.fillStyle = PALETTE.planeGlass;
  ctx.beginPath();
  ctx.moveTo(20, -8);
  ctx.quadraticCurveTo(38, -8, 44, -2);
  ctx.lineTo(22, -2);
  ctx.closePath();
  ctx.fill();
  // Near wing.
  ctx.fillStyle = '#ff9440';
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(2, 34);
  ctx.lineTo(14, 32);
  ctx.lineTo(12, 6);
  ctx.closePath();
  ctx.fill();
  // Propeller blur at the nose.
  ctx.fillStyle = 'rgba(200,220,240,0.5)';
  ctx.beginPath();
  ctx.ellipse(58, -2, 3, 22 + Math.sin(game.time * 40) * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-52, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7dff9a';
  ctx.beginPath();
  ctx.arc(14, 32, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawHud(ctx, game) {
  const { plane, world } = game;
  const mission = world.mission;
  const speedKnots = Math.round((plane.speed * 1.94384));
  const altFt = Math.round(plane.alt * 3.28084);
  const nextRing = world.rings.find((r) => !r.passed);
  const done = world.rings.filter((r) => r.passed).length;

  panel(ctx, 12, 10, 1256, 46);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`ALT ${altFt} FT`, 26, 40);
  ctx.fillText(`SPD ${speedKnots} KT`, 220, 40);
  ctx.fillText(`HDG ${String(Math.round(plane.heading)).padStart(3, '0')}°`, 420, 40);
  // Fuel bar.
  ctx.fillStyle = plane.fuel < 25 ? PALETTE.hudWarn : PALETTE.hudGood;
  ctx.fillRect(600, 22, 140 * (plane.fuel / plane.fuelMax), 12);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.strokeRect(600, 22, 140, 12);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`FUEL ${Math.round(plane.fuel)}`, 600, 52);
  ctx.fillText(`SCORE ${game.score}`, 790, 40);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`◈ ${game.shop.credits} CR`, 950, 40);
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'right';
  ctx.fillText(`M${mission.id} ${mission.name.toUpperCase()}`, 1256, 40);
  ctx.font = '13px monospace';
  ctx.fillText(
    nextRing ? `RING ${done + 1}/${world.rings.length}` : game.boss ? 'DESTROY THE CARRIER' : 'ALL RINGS CLEAR',
    1256,
    52,
  );
  ctx.textAlign = 'left';

  // Time left, flashing when low.
  const tLeft = Math.max(0, Math.ceil(game.timeLeft));
  ctx.fillStyle = tLeft <= 20 ? PALETTE.hudWarn : PALETTE.hudText;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`⏱ ${Math.floor(tLeft / 60)}:${String(tLeft % 60).padStart(2, '0')}`, 26, 76);

  // Hull bar under the top panel.
  ctx.fillStyle = '#3a0d0a';
  ctx.fillRect(220, 62, 180, 10);
  ctx.fillStyle = plane.hull > 30 ? PALETTE.hudGood : PALETTE.hudWarn;
  ctx.fillRect(220, 62, 180 * (plane.hull / plane.hullMax), 10);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.strokeRect(220, 62, 180, 10);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px monospace';
  ctx.fillText(`HULL ${Math.round(plane.hull)}`, 406, 72);
}

// Bottom instruments: artificial horizon, altimeter tape, throttle gauge,
// compass strip. Lit dials, the way a flown cockpit looks.
function drawInstruments(ctx, game) {
  const { plane } = game;
  // Artificial horizon.
  const hx = 90;
  const hy = 620;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, 52, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2f6fb2';
  ctx.fillRect(hx - 52, hy - 52, 104, 52);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(hx - 52, hy, 104, 52);
  ctx.fillStyle = '#fff';
  ctx.fillRect(hx - 52, hy - 1, 104, 2);
  ctx.restore();
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(hx - 22, hy);
  ctx.lineTo(hx + 22, hy);
  ctx.lineTo(hx, hy + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', hx, hy + 68);

  // Altimeter tape on the left edge.
  const altFt = Math.round(plane.alt * 3.28084);
  panel(ctx, 12, 180, 74, 300);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ALT FT', 49, 200);
  ctx.font = '15px monospace';
  for (let i = -3; i <= 3; i++) {
    const v = Math.max(0, Math.round((altFt + i * 100) / 100) * 100);
    const y = 330 - i * 38;
    ctx.fillStyle = i === 0 ? '#ffd23f' : PALETTE.hudText;
    ctx.fillText(String(v), 49, y);
  }
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('▶', 12, 334);

  // Speed tape on the right edge.
  const speedKnots = Math.round(plane.speed * 1.94384);
  panel(ctx, 1194, 180, 74, 300);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px monospace';
  ctx.fillText('SPD KT', 1231, 200);
  ctx.font = '15px monospace';
  for (let i = -3; i <= 3; i++) {
    const v = Math.max(0, speedKnots + i * 10);
    const y = 330 - i * 38;
    ctx.fillStyle = i === 0 ? '#ffd23f' : PALETTE.hudText;
    ctx.fillText(String(v), 1231, y);
  }
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('◀', 1262, 334);

  // Compass strip along the bottom.
  const cx = 640;
  const cy = 660;
  panel(ctx, cx - 260, cy - 18, 520, 36);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 260, cy - 18, 520, 36);
  ctx.clip();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  for (let h = 0; h < 360; h += 15) {
    let d = h - plane.heading;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    const x = cx + d * 4;
    if (x < cx - 260 || x > cx + 260) continue;
    const label = h === 0 ? 'N' : h === 90 ? 'E' : h === 180 ? 'S' : h === 270 ? 'W' : String(h);
    ctx.fillText(label, x, cy + 5);
    ctx.fillRect(x, cy - 14, 1, 6);
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.lineTo(cx - 6, cy - 28);
  ctx.lineTo(cx + 6, cy - 28);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'left';

  // Controls hint.
  ctx.fillStyle = 'rgba(234,246,255,0.75)';
  ctx.font = '13px monospace';
  ctx.fillText('W/S pitch · A/D bank · SHIFT throttle · SPACE fire · M mute · P pause', 12, 706);
}

function drawTitleCard(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,32,0.55)';
  ctx.fillRect(210, 96, 860, 168);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.strokeRect(210.5, 96.5, 859, 167);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('SKYLINE COURIER', 640, 150);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '20px monospace';
  ctx.fillText('Rings, Upgrades & the Storm Carrier', 640, 184);
  ctx.font = '15px monospace';
  ctx.fillStyle = 'rgba(234,246,255,0.9)';
  ctx.fillText('AUTOPILOT DEMO — the courier flies itself.', 640, 214);
  ctx.fillText('Press any key to take the stick.', 640, 236);
  ctx.fillText(`Mission ${game.world.mission.id}: ${game.world.mission.name} — ${game.world.mission.brief}`, 640, 258);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawBriefCard(ctx, game) {
  const m = game.world.mission;
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,32,0.78)';
  ctx.fillRect(340, 220, 600, 190);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.strokeRect(340.5, 220.5, 599, 189);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`MISSION ${m.id} — ${m.name.toUpperCase()}`, 640, 266);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '17px monospace';
  ctx.fillText(m.brief, 640, 300);
  ctx.font = '15px monospace';
  ctx.fillText(`${m.rings} rings · ${Math.floor(m.timeLimit / 60)}:${String(m.timeLimit % 60).padStart(2, '0')} on the clock · band ${Math.round(m.band[0] * 3.28)}–${Math.round(m.band[1] * 3.28)} ft`, 640, 330);
  if (m.wind) ctx.fillText(`Wind ${m.wind} kt from the west — hold your line.`, 640, 356);
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press ENTER or click to launch', 640, 388);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawShopPanel(ctx, game) {
  const rows = game.shopRows;
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,32,0.85)';
  ctx.fillRect(240, 130, 800, 440);
  ctx.strokeStyle = PALETTE.hudLine;
  ctx.strokeRect(240.5, 130.5, 799, 439);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('HANGAR — UPGRADE SHOP', 640, 176);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '18px monospace';
  ctx.fillText(`Credits: ${game.shop.credits}   ·   Press 1 / 2 / 3 to buy, ENTER for the next mission`, 640, 206);
  rows.forEach((row, i) => {
    const y = 250 + i * 92;
    ctx.fillStyle = 'rgba(127,212,255,0.12)';
    ctx.fillRect(270, y, 740, 76);
    ctx.strokeStyle = PALETTE.hudLine;
    ctx.strokeRect(270.5, y + 0.5, 739, 75);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`[${i + 1}] ${row.label} — ${row.currentName}`, 290, y + 30);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '15px monospace';
    ctx.fillText(row.blurb, 290, y + 54);
    ctx.textAlign = 'right';
    if (row.nextPrice === null) {
      ctx.fillStyle = '#7dff9a';
      ctx.fillText('MAXED', 990, y + 30);
    } else {
      ctx.fillStyle = row.affordable ? '#7dff9a' : '#ff5d4d';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${row.nextName} — ${row.nextPrice} CR`, 990, y + 30);
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = '13px monospace';
      ctx.fillText(row.affordable ? 'affordable' : 'not enough credits', 990, y + 54);
    }
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = game.shopMessage || 'rgba(234,246,255,0.85)';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '15px monospace';
  ctx.fillText(game.shopMessage || 'Spend wisely — the Storm Carrier is waiting.', 640, 540);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawVictoryPanel(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,32,0.82)';
  ctx.fillRect(330, 190, 620, 300);
  ctx.strokeStyle = '#7dff9a';
  ctx.strokeRect(330.5, 190.5, 619, 299);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('MISSION COMPLETE', 640, 246);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '18px monospace';
  ctx.fillText(game.victoryLine, 640, 286);
  ctx.font = '17px monospace';
  ctx.fillText(`Score ${game.score} · Credits earned ${game.lastReward} · Total ${game.shop.credits}`, 640, 320);
  ctx.fillText(`Rings ${game.lastRings}/${game.world.rings.length} · Time bonus ${game.lastTimeBonus}`, 640, 348);
  if (game.campaignDone) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('THE STORM CARRIER IS DOWN. COURIER LEGEND.', 640, 392);
  }
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(game.campaignDone ? 'Press ENTER to fly again' : 'Press ENTER for the hangar', 640, 452);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawCrashPanel(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,8,8,0.82)';
  ctx.fillRect(330, 220, 620, 240);
  ctx.strokeStyle = PALETTE.hudWarn;
  ctx.strokeRect(330.5, 220.5, 619, 239);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d4d';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('COURIER DOWN', 640, 276);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '18px monospace';
  ctx.fillText(game.crashLine, 640, 314);
  ctx.fillText(`Score ${game.score} · Mission ${game.world.mission.id} — ${game.world.mission.name}`, 640, 344);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press ENTER to retry the mission', 640, 420);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawOutOfFuelPanel(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,32,0.85)';
  ctx.fillRect(330, 220, 620, 240);
  ctx.strokeStyle = '#ffd23f';
  ctx.strokeRect(330.5, 220.5, 619, 239);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 34px monospace';
  ctx.fillText('OUT OF FUEL', 640, 276);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '18px monospace';
  ctx.fillText('The courier glided down onto the flats. The crew refuelled her.', 640, 314);
  ctx.fillText(`Score ${game.score} · Mission ${game.world.mission.id} — ${game.world.mission.name}`, 640, 344);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press ENTER to retry the mission', 640, 420);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawToast(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,20,32,0.8)';
  const w = ctx.measureText(game.message).width + 36;
  ctx.fillRect(640 - w / 2, 110, w, 34);
  ctx.strokeStyle = '#7dff9a';
  ctx.strokeRect(640 - w / 2 + 0.5, 110.5, w - 1, 33);
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(game.message, 640, 133);
  ctx.restore();
  ctx.textAlign = 'left';
}
