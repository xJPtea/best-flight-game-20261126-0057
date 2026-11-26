// Skyline Courier — all sound is synthesized with WebAudio. No audio
// files, no network, just oscillators and filtered noise. The context is
// created lazily on the first user gesture, so a silent page load (and a
// headless screenshot run) never touches audio at all.

let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  } catch {
    ctx = null;
  }
  return ctx;
}

// Call from any user gesture (key, click). Safe to call repeatedly.
export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

// Continuous engine hum. Throttle 0..1 sets pitch and loudness.
export function setEngine(throttle, speedKnots) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(48 + throttle * 70 + speedKnots * 0.08, t, 0.08);
  engineGain.gain.setTargetAtTime(0.02 + throttle * 0.05, t, 0.1);
}

function tone(freq, dur, type, vol, when = 0) {
  if (!ensureContext() || muted) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ensureContext() || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t);
}

export function playRingChime() {
  tone(880, 0.28, 'sine', 0.22);
  tone(1318, 0.34, 'sine', 0.16, 0.07);
}

export function playShot() {
  noiseBurst(0.09, 0.3, 2400);
  tone(220, 0.08, 'square', 0.1);
}

export function playHit() {
  noiseBurst(0.16, 0.4, 900);
  tone(110, 0.2, 'sawtooth', 0.18);
}

export function playExplosion() {
  noiseBurst(0.9, 0.55, 500);
  tone(60, 0.8, 'sine', 0.4);
  tone(45, 1.0, 'sine', 0.3, 0.15);
}

export function playMissionComplete() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.32, 'triangle', 0.2, i * 0.11));
}

export function playBuy() {
  tone(660, 0.12, 'triangle', 0.2);
  tone(990, 0.18, 'triangle', 0.2, 0.09);
}

export function playDenied() {
  tone(180, 0.16, 'square', 0.14);
  tone(140, 0.2, 'square', 0.14, 0.1);
}
