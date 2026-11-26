// Skyline Courier — the game loop and state machine. This file owns the
// plane's physics, ring checks, firing, the mission flow (attract, brief,
// fly, shop, victory, crash) and the wiring between every other module.

import { MISSIONS, PHYSICS, GAME_TITLE } from './config.js';
import { buildWorld, terrainHeightAt } from './world.js';
import { createInput, held, tapped, endFrame } from './input.js';
import { render } from './render.js';
import { createBoss, updateBoss, hitBossCore, bossCore } from './boss.js';
import { autopilotControl } from './autopilot.js';
import { createShop, effectiveStats, buyTier, shopRows } from './upgrades.js';
import { loadSave, storeSave } from './save.js';
import {
  unlockAudio,
  setEngine,
  toggleMute,
  playRingChime,
  playShot,
  playHit,
  playExplosion,
  playMissionComplete,
} from './audio.js';
import { shotParams, applyShot, isShotMode } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = 1280;
canvas.height = 720;

const input = createInput(canvas);
const save = loadSave();
const shop = createShop(save);

function freshPlane(stats) {
  return {
    x: 120,
    alt: 6,
    speed: 0,
    heading: 90,
    throttle: 0,
    pitch: 0,
    pitchVisual: 0,
    fuel: PHYSICS.fuelTank + stats.fuelBonus,
    fuelMax: PHYSICS.fuelTank + stats.fuelBonus,
    hull: PHYSICS.hull + stats.hullBonus,
    hullMax: PHYSICS.hull + stats.hullBonus,
  };
}

function freshGame(missionIndex) {
  const stats = effectiveStats(shop);
  const world = buildWorld(missionIndex);
  return {
    mode: 'attract',
    attract: true,
    paused: false,
    time: 0,
    timeLeft: world.mission.timeLimit,
    score: 0,
    missionIndex,
    world,
    boss: null,
    plane: freshPlane(stats),
    stats,
    shots: [],
    flakHits: [],
    shop,
    shopRows: shopRows(shop),
    shopMessage: '',
    message: '',
    messageTimer: 0,
    victoryLine: '',
    lastReward: 0,
    lastRings: 0,
    lastTimeBonus: 0,
    campaignDone: false,
    crashLine: '',
    fireCooldown: 0,
    idleTimer: 0,
  };
}

let game = freshGame(0);

function showMessage(text, seconds = 2.4) {
  game.message = text;
  game.messageTimer = seconds;
}

function startMission(index) {
  const keepScore = game.score;
  game = freshGame(index);
  game.score = keepScore;
  game.mode = 'brief';
  game.attract = false;
}

function completeMission() {
  const mission = game.world.mission;
  const timeBonus = Math.round(game.timeLeft) * 2;
  const reward = PHYSICS.deliveryBase + timeBonus;
  const ringsDone = game.world.rings.filter((r) => r.passed).length;
  game.shop.credits += reward;
  game.lastReward = reward;
  game.lastRings = ringsDone;
  game.lastTimeBonus = timeBonus;
  game.victoryLine = `Mission ${mission.id} — ${mission.name}: all rings threaded.`;
  game.campaignDone = mission.id === MISSIONS.length;
  if (game.campaignDone) save.bestMission = MISSIONS.length;
  else save.bestMission = Math.max(save.bestMission, mission.id);
  save.credits = game.shop.credits;
  save.upgrades = { ...game.shop.levels };
  storeSave(save);
  playMissionComplete();
  game.mode = 'victory';
}

function crash(reason) {
  game.crashLine = reason;
  playExplosion();
  game.mode = 'crashed';
}

function outOfFuel() {
  game.mode = 'outoffuel';
}

// One physics step. `control` is { pitch, throttle, fire } in -1..1 / 0..1.
function stepPlane(dt, control) {
  const p = game.plane;
  const stats = game.stats;
  const mission = game.world.mission;

  p.throttle = control.throttle;
  p.pitch = control.pitch;

  // Speed chases the throttle setting; banking bleeds a little speed.
  const targetSpeed = p.throttle * (PHYSICS.baseSpeed + stats.speedBonus);
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.9);
  const bankDrag = Math.abs(p.heading - 90) / 48;
  p.speed -= bankDrag * 4 * dt;
  if (p.speed < 0) p.speed = 0;

  // Forward motion follows heading: 90 is due east, full speed ahead.
  const headingRad = ((p.heading - 90) * Math.PI) / 180;
  const forward = Math.cos(headingRad);
  let vx = p.speed * forward - mission.wind * 0.4;
  if (vx < 8) vx = 8; // the courier always creeps forward
  p.x += vx * dt;

  // Climb and sink. Slow flight cannot hold altitude.
  const climbPower = p.speed >= PHYSICS.minSpeed ? 1 : p.speed / PHYSICS.minSpeed;
  const climb = control.pitch * (PHYSICS.climbRate + stats.climbBonus) * climbPower;
  const sink = p.speed < PHYSICS.minSpeed ? PHYSICS.sinkRate * (1 - p.speed / PHYSICS.minSpeed) : 0;
  p.alt += (climb - sink) * dt;
  // Gentle wind gusts push the altitude around in the later missions.
  if (mission.wind > 0) {
    p.alt += Math.sin(game.time * 0.9 + p.x * 0.001) * mission.wind * 0.12 * dt;
  }
  p.pitchVisual += (control.pitch * 0.35 - p.pitchVisual) * Math.min(1, dt * 6);

  // Fuel.
  p.fuel -= PHYSICS.fuelDrain * p.throttle * dt;
  if (p.fuel < 0) p.fuel = 0;

  // Ground: rolling is fine, a fast arrival is not.
  const ground = terrainHeightAt(p.x, game.world.seed);
  if (p.alt <= ground + 4) {
    if (p.speed > 46) {
      crash('She hit the ground at speed — the courier is a wreck.');
      return;
    }
    p.alt = ground + 4; // rolling on the ground
  }
  if (p.alt > 1400) p.alt = 1400; // service ceiling
}

function stepRings() {
  const p = game.plane;
  for (const ring of game.world.rings) {
    if (ring.passed) continue;
    const dx = Math.abs(p.x - ring.x);
    const dy = Math.abs(p.alt - ring.y);
    if (dx < 95 && dy < ring.radius) {
      ring.passed = true;
      ring.flash = 1;
      game.score += 100;
      game.shop.credits += PHYSICS.ringCredit;
      p.fuel = Math.min(p.fuelMax, p.fuel + PHYSICS.ringFuelBonus);
      playRingChime();
      const done = game.world.rings.filter((r) => r.passed).length;
      showMessage(`RING ${done}/${game.world.rings.length}  +100 PTS  +${PHYSICS.ringCredit} CR`);
      if (done === game.world.rings.length && !game.world.mission.boss) {
        completeMission();
      }
    }
  }
  for (const ring of game.world.rings) {
    if (ring.flash > 0) ring.flash -= 0.016;
  }
}

function stepFiring(dt, fire) {
  const p = game.plane;
  game.fireCooldown -= dt;
  if (fire && game.fireCooldown <= 0 && game.mode === 'fly') {
    game.shots.push({ x: p.x + 60, y: p.alt, vx: 560, vy: p.pitch * 60, life: 1.1 });
    game.fireCooldown = 0.22;
    playShot();
  }
  for (const s of game.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  game.shots = game.shots.filter((s) => s.life > 0 && s.x < p.x + 2600);

  // Bullet vs boss core.
  if (game.boss && !game.boss.dead) {
    const core = bossCore(game.boss);
    for (const s of game.shots) {
      if (Math.hypot(s.x - core.x, s.y - core.y) < core.r + 6) {
        s.life = 0;
        const killed = hitBossCore(game.boss, 9);
        game.score += 25;
        playHit();
        if (killed) {
          game.score += 500;
          showMessage('STORM CARRIER DOWN  +500 PTS');
          completeMission();
        }
        break;
      }
    }
  }
}

function stepFlak(dt) {
  const p = game.plane;
  if (!game.boss) return;
  for (const f of game.boss.flak) {
    if (Math.hypot(f.x - p.x, f.y - p.alt) < 30) {
      f.life = 0;
      p.hull -= 12;
      game.flakHits.push({ x: f.x, y: f.y, age: 0 });
      playHit();
      if (p.hull <= 0) {
        p.hull = 0;
        crash('Flak tore the hull apart over the storm line.');
      }
    }
  }
  for (const h of game.flakHits) h.age += dt;
  game.flakHits = game.flakHits.filter((h) => h.age < 0.5);
}

function playerControl() {
  let pitch = 0;
  if (held(input, 'w', 'ArrowUp')) pitch += 1;
  if (held(input, 's', 'ArrowDown')) pitch -= 1;
  let bank = 0;
  if (held(input, 'a', 'ArrowLeft')) bank -= 1;
  if (held(input, 'd', 'ArrowRight')) bank += 1;
  if (bank !== 0) {
    game.plane.heading += bank * PHYSICS.turnRate * (1 / 60);
    game.plane.heading = Math.max(PHYSICS.headingMin, Math.min(PHYSICS.headingMax, game.plane.heading));
  } else {
    // Heading eases back to due east when the stick is centred.
    game.plane.heading += (90 - game.plane.heading) * 0.05;
  }
  // Mouse: holding the button steers toward the cursor's height.
  if (input.mouseDown) {
    const targetAlt = 1400 - (input.mouseY / 720) * 1400;
    pitch = Math.max(-1, Math.min(1, (targetAlt - game.plane.alt) / 200));
  }
  let throttle = game.plane.throttle;
  if (held(input, 'Shift')) throttle = Math.min(1, throttle + 0.02);
  if (held(input, 'Control', 'c')) throttle = Math.max(0.25, throttle - 0.02);
  if (held(input, '+', '=')) throttle = Math.min(1, throttle + 0.02);
  if (held(input, '-')) throttle = Math.max(0.25, throttle - 0.02);
  const fire = held(input, ' ') || input.mouseDown;
  return { pitch, throttle, fire };
}

function update(dt) {
  game.time += dt;
  if (game.messageTimer > 0) {
    game.messageTimer -= dt;
    if (game.messageTimer <= 0) game.message = '';
  }

  if (tapped(input, 'm')) toggleMute();
  if (tapped(input, 'p') && game.mode === 'fly') game.paused = !game.paused;
  if (game.paused) {
    endFrame(input);
    return;
  }

  // Any key or click wakes the demo and shows the mission brief.
  if (game.mode === 'attract') {
    const control = autopilotControl(game.plane, game.world, game.boss);
    stepPlane(dt, control);
    stepRings();
    if (input.pressed.size > 0) {
      unlockAudio();
      game.mode = 'brief';
      game.attract = false;
    }
    endFrame(input);
    return;
  }

  if (game.mode === 'brief') {
    if (tapped(input, 'Enter', ' ', 'mouse')) {
      unlockAudio();
      game.mode = 'fly';
      game.plane.throttle = 0.55;
    }
    endFrame(input);
    return;
  }

  if (game.mode === 'shop') {
    if (tapped(input, '1')) game.shopMessage = buyTier(game.shop, 'engine');
    if (tapped(input, '2')) game.shopMessage = buyTier(game.shop, 'hull');
    if (tapped(input, '3')) game.shopMessage = buyTier(game.shop, 'tank');
    game.shopRows = shopRows(game.shop);
    save.credits = game.shop.credits;
    save.upgrades = { ...game.shop.levels };
    storeSave(save);
    if (tapped(input, 'Enter')) {
      const next = game.campaignDone ? 0 : game.missionIndex + 1;
      startMission(next);
    }
    endFrame(input);
    return;
  }

  if (game.mode === 'victory') {
    if (tapped(input, 'Enter', ' ', 'mouse')) {
      game.mode = 'shop';
      game.shopRows = shopRows(game.shop);
    }
    endFrame(input);
    return;
  }

  if (game.mode === 'crashed' || game.mode === 'outoffuel') {
    if (tapped(input, 'Enter', ' ', 'mouse')) startMission(game.missionIndex);
    endFrame(input);
    return;
  }

  // Flying.
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    crash('Out of time — the delivery window closed.');
    endFrame(input);
    return;
  }

  const control = playerControl();
  stepPlane(dt, control);
  if (game.mode !== 'fly') {
    endFrame(input);
    return;
  }
  stepRings();
  stepFiring(dt, control.fire);
  if (game.mode !== 'fly') {
    endFrame(input);
    return;
  }

  // The boss arrives once the rings are cleared on the final mission.
  if (game.world.mission.boss && !game.boss) {
    const done = game.world.rings.filter((r) => r.passed).length;
    if (done === game.world.rings.length) {
      game.boss = createBoss(game.world.bossX, game.world.bossY);
      showMessage('THE STORM CARRIER — AIM FOR THE GLOWING CORE', 4);
    }
  }
  if (game.boss) {
    updateBoss(game.boss, dt, game.plane, () => {});
    stepFlak(dt);
  }

  // Out of fuel: glide down and call it.
  if (game.plane.fuel <= 0 && game.plane.speed < 30) {
    outOfFuel();
  }

  setEngine(game.plane.throttle, Math.round(game.plane.speed * 1.94));
  endFrame(input);
}

// Boot: shot mode pre-runs a fixed scene and freezes; normal mode runs
// the demo autopilot from the first frame.
function boot() {
  document.title = GAME_TITLE;
  const { shot, seed } = shotParams();
  if (shot) {
    const detail = applyShot(game, shot, seed);
    const steps = detail.preSteps || 0;
    for (let i = 0; i < steps; i++) update(1 / 60);
    render(ctx, game);
    window.__shotReady = true;
    return;
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Debug hook for play-testing: the live game state is readable as
// window.__skyline (plane, score, mode, rings). Read-only by convention.
Object.defineProperty(window, '__skyline', { get: () => game });

boot();
