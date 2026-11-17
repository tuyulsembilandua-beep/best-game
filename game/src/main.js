// Lumen Drift: bootstrap, the game loop, the state machine (title / playing /
// paused / over), collisions and wave progression. The loop owns the state;
// every other file owns one piece of it.

import { CFG } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createSfx } from './audio.js';
import { createPlayer, updatePlayer, hurtPlayer } from './player.js';
import { startWave, updateEnemies, damageEnemy } from './enemies.js';
import { updateBullets } from './bullets.js';
import { updatePickups } from './pickups.js';
import { updateParticles, spawnText } from './particles.js';
import { draw } from './render.js';
import { parseShot, setupShot, driveShot, shotTargetFrames } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const BEST_KEY = 'lumen-drift-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage is a nicety; the game plays on without it.
  }
}

function createState() {
  const state = {
    w: window.innerWidth,
    h: window.innerHeight,
    time: 0,
    frame: 0,
    mode: 'title', // title | playing | paused | over
    score: 0,
    combo: 1,
    comboTimer: 0,
    best: loadBest(),
    wave: 0,
    spawnLeft: 0,
    spawnTimer: 0,
    waveBanner: 0,
    waveActive: false,
    betweenWaves: 0,
    shake: 0,
    player: null,
    enemies: [],
    bullets: [],
    ebullets: [],
    pickups: [],
    particles: [],
    texts: [],
    stars: [],
    rng: makeRng((Date.now() % 2147483647) || 1),
    input: null,
    sfx: createSfx(),
    shot: null,
  };
  state.input = createInput(canvas);
  state.player = createPlayer(state.w, state.h);
  // Stars live in normalised coordinates so a resize keeps them spread out.
  for (let i = 0; i < 90; i++) {
    state.stars.push({
      x: state.rng.next(),
      y: state.rng.next(),
      r: 1 + state.rng.next() * 1.6,
      tw: 0.6 + state.rng.next() * 2,
      ph: state.rng.next() * Math.PI * 2,
    });
  }
  return state;
}

const state = createState();

// A debug hook for automated playtests: the live state, read-only in practice.
window.__game = state;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  state.w = canvas.width;
  state.h = canvas.height;
}

function resetGame() {
  state.score = 0;
  state.combo = 1;
  state.comboTimer = 0;
  state.wave = 0;
  state.spawnLeft = 0;
  state.spawnTimer = 0;
  state.waveBanner = 0;
  state.waveActive = false;
  state.betweenWaves = 0;
  state.shake = 0;
  state.enemies = [];
  state.bullets = [];
  state.ebullets = [];
  state.pickups = [];
  state.particles = [];
  state.texts = [];
  state.player = createPlayer(state.w, state.h);
  state.mode = 'playing';
  startWave(state, 1);
  setStatus('Playing: wave 1. Score 0.');
}

function endGame() {
  state.mode = 'over';
  const isBest = state.score > state.best;
  if (isBest) {
    state.best = state.score;
    saveBest(state.best);
  }
  state.sfx.gameOver();
  setStatus(`Game over. Score ${state.score}, reached wave ${state.wave}. Press R to play again.`);
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function resolveCollisions() {
  const p = state.player;
  // Ship bolts against shades.
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    let spent = false;
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (e.decorative) continue;
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const rr = b.radius + e.radius;
      if (dx * dx + dy * dy < rr * rr) {
        spent = true;
        if (damageEnemy(state, e, 1)) state.enemies.splice(j, 1);
        break;
      }
    }
    if (spent) state.bullets.splice(i, 1);
  }
  if (!p.alive) return;
  // Warden orbs against the ship.
  for (let i = state.ebullets.length - 1; i >= 0; i--) {
    const b = state.ebullets[i];
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const rr = b.radius + CFG.playerRadius;
    if (dx * dx + dy * dy < rr * rr) {
      state.ebullets.splice(i, 1);
      if (hurtPlayer(state)) endGame();
      break;
    }
  }
  if (!p.alive) return;
  // Shades against the ship: a hit costs a heart, and the shade burns up.
  // Dashing through a shade destroys it for free.
  for (let j = state.enemies.length - 1; j >= 0; j--) {
    const e = state.enemies[j];
    if (e.decorative) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const rr = CFG.playerRadius + e.radius;
    if (dx * dx + dy * dy < rr * rr) {
      const died = hurtPlayer(state);
      if (damageEnemy(state, e, 99)) state.enemies.splice(j, 1);
      if (died) {
        endGame();
        break;
      }
    }
  }
}

function step(dt) {
  state.time += dt;
  state.frame += 1;
  if (state.mode !== 'playing') {
    updateParticles(state, dt);
    return;
  }
  // The scripted pilot (screenshot mode) steers through the input object.
  if (state.input.scripted) {
    state.input.drive = state.input.scripted(state.frame, state);
  }
  state.waveBanner = Math.max(0, state.waveBanner - dt);
  // Combo decays toward x1 once its window lapses.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
  } else if (state.combo > 1) {
    state.combo = Math.max(1, state.combo - 0.5 * dt);
  }
  updatePlayer(state, dt);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updatePickups(state, dt);
  updateParticles(state, dt);
  resolveCollisions();
  if (state.mode !== 'playing') return; // the ship may have died above
  // Wave cleared: a bonus, a breath, then the next wave.
  if (state.waveActive && state.spawnLeft === 0 && state.enemies.length === 0) {
    state.waveActive = false;
    const bonus = 100 * state.wave;
    state.score += bonus;
    spawnText(state, state.w / 2, state.h / 2 - 120, `WAVE CLEAR  +${bonus}`, '#ffe066');
    state.betweenWaves = 1.8;
    setStatus(`Wave ${state.wave} cleared. Score ${state.score}.`);
  } else if (!state.waveActive && state.betweenWaves > 0) {
    state.betweenWaves -= dt;
    if (state.betweenWaves <= 0) startWave(state, state.wave + 1);
  }
}

// ---- Controls: keyboard and mouse, one place. ----
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  state.sfx.unlock();
  if (key === 'm') {
    const muted = state.sfx.toggleMute();
    setStatus(muted ? 'Muted.' : 'Sound on.');
    return;
  }
  if (state.mode === 'title' && (key === 'enter' || key === ' ')) {
    resetGame();
    return;
  }
  if (state.mode === 'over' && (key === 'r' || key === 'enter' || key === ' ')) {
    resetGame();
    return;
  }
  if (key === 'p' && (state.mode === 'playing' || state.mode === 'paused')) {
    state.mode = state.mode === 'playing' ? 'paused' : 'playing';
    setStatus(state.mode === 'paused' ? 'Paused. Press P to resume.' : 'Playing.');
  }
});

canvas.addEventListener('mousedown', () => {
  state.sfx.unlock();
  if (state.mode === 'title' || state.mode === 'over') resetGame();
});

// ---- Boot: screenshot mode runs a fixed simulation, otherwise the loop. ----
function resizeAndDraw() {
  resize();
  draw(ctx, state);
}

window.addEventListener('resize', resizeAndDraw);
state.input.attach();
resize();

const shot = parseShot();
if (shot) {
  // Deterministic run: fixed steps, no animation frames, one final render.
  setupShot(state, shot);
  state.input.scripted = (frame) => driveShot(state, frame);
  const target = shotTargetFrames(state);
  let frames = 0;
  let overFrames = 0;
  while (frames < target) {
    step(1 / 60);
    frames += 1;
    if (state.mode === 'over') {
      overFrames += 1;
      if (shot.kind === 'end' && overFrames >= 45) break;
      if (shot.kind === 'play') break; // died early: freeze on what happened
    }
  }
  resizeAndDraw();
  window.__shotDone = true;
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    step(dt);
    draw(ctx, state);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
