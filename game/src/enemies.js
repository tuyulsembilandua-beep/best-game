// The shades: five kinds of enemy, and the wave director that sends them in.
// Chasers hunt the ship, drifters weave, splitters burst into minis when they
// die, and every fifth wave is led by a warden that fires back.

import { CFG } from './config.js';
import { spawnBurst, spawnText } from './particles.js';

export function createEnemy(state, kind, x, y) {
  const t = CFG.kinds[kind];
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: t.radius,
    hp: t.hp,
    maxHp: t.hp,
    speed: t.speed * state.rng.range(0.9, 1.1),
    score: t.score,
    // Drifters weave with a sine offset; wardens fire on a timer.
    phase: state.rng.next() * Math.PI * 2,
    fireTimer: state.rng.range(1.2, 2.2),
    flash: 0, // white flash timer after a hit
  };
}

function edgeSpawn(state) {
  const side = state.rng.int(0, 3);
  const m = 30;
  if (side === 0) return { x: state.rng.range(0, state.w), y: -m };
  if (side === 1) return { x: state.w + m, y: state.rng.range(0, state.h) };
  if (side === 2) return { x: state.rng.range(0, state.w), y: state.h + m };
  return { x: -m, y: state.rng.range(0, state.h) };
}

function pickKind(state) {
  const w = state.wave;
  const roll = state.rng.next();
  if (w >= 5 && roll < 0.12) return 'splitter';
  if (w >= 3 && roll < 0.32) return 'drifter';
  if (w >= 2 && roll < 0.22) return 'splitter';
  return 'chaser';
}

// How many shades wave n fields, and how fast they arrive.
export function waveSize(n) {
  return CFG.waveBaseCount + CFG.wavePerLevel * n;
}

export function spawnInterval(state) {
  return Math.max(
    CFG.spawnIntervalMin,
    CFG.spawnInterval - (state.wave - 1) * 0.09,
  );
}

export function startWave(state, n) {
  state.wave = n;
  state.spawnLeft = waveSize(n);
  state.spawnTimer = 0.6;
  state.waveBanner = 2.2; // seconds the "WAVE n" banner shows
  state.waveActive = true;
  if (n % CFG.wardenEvery === 0) {
    const at = edgeSpawn(state);
    state.enemies.push(createEnemy(state, 'warden', at.x, at.y));
    state.spawnLeft -= 1;
  }
  state.sfx.wave();
}

export function updateEnemies(state, dt) {
  const p = state.player;

  // The director: keep spawning until the wave's roster is on the field.
  if (state.waveActive && state.spawnLeft > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.spawnTimer = spawnInterval(state);
      const at = edgeSpawn(state);
      state.enemies.push(createEnemy(state, pickKind(state), at.x, at.y));
      state.spawnLeft -= 1;
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (e.kind === 'chaser' || e.kind === 'mini') {
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
    } else if (e.kind === 'drifter') {
      // Weave sideways while closing in: a sine strafe on the perpendicular.
      const t = state.time * 2.2 + e.phase;
      const px = -ny * Math.sin(t);
      const py = nx * Math.sin(t);
      e.vx = nx * e.speed + px * e.speed * 0.9;
      e.vy = ny * e.speed + py * e.speed * 0.9;
    } else if (e.kind === 'splitter') {
      e.vx = nx * e.speed * 0.8;
      e.vy = ny * e.speed * 0.8;
    } else if (e.kind === 'warden') {
      // Slow advance, and a aimed shot every couple of seconds.
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && p.alive && dist < 560) {
        e.fireTimer = state.rng.range(1.6, 2.4);
        state.ebullets.push({
          x: e.x,
          y: e.y,
          vx: nx * CFG.enemyBulletSpeed,
          vy: ny * CFG.enemyBulletSpeed,
          life: 4,
          radius: CFG.enemyBulletRadius,
          friendly: false,
        });
        spawnBurst(state, e.x, e.y, '#c77dff', 6, 120, 0.3);
      }
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
}

// An enemy takes a hit. Returns true when it died.
export function damageEnemy(state, enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.09;
  if (enemy.hp > 0) {
    state.sfx.hit();
    return false;
  }
  // Death: burst, score, and maybe a mote or a powerup.
  const color = enemy.kind === 'warden' ? '#c77dff' : '#ff5d73';
  spawnBurst(state, enemy.x, enemy.y, color, enemy.kind === 'warden' ? 40 : 16, 240, 0.6);
  addScore(state, enemy.score);
  spawnText(state, enemy.x, enemy.y, `+${Math.round(enemy.score * state.combo)}`, '#ffe066');
  state.sfx.explode();
  if (enemy.kind === 'splitter') {
    for (let k = 0; k < 2; k++) {
      const mini = createEnemy(state, 'mini', enemy.x + state.rng.range(-14, 14), enemy.y + state.rng.range(-14, 14));
      state.enemies.push(mini);
    }
  }
  dropLoot(state, enemy);
  return true;
}

function dropLoot(state, enemy) {
  // Every kill drops a mote; wardens and lucky kills drop a powerup instead.
  const roll = state.rng.next();
  if (enemy.kind === 'warden' || roll < 0.07) {
    const kind = state.rng.pick(['shield', 'rapid', 'spread']);
    state.pickups.push({ kind, x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: 12, radius: 12 });
  } else {
    state.pickups.push({
      kind: 'mote',
      x: enemy.x,
      y: enemy.y,
      vx: state.rng.range(-40, 40),
      vy: state.rng.range(-40, 40),
      life: 9,
      radius: CFG.moteRadius,
    });
  }
}

// Score with the combo multiplier; the multiplier itself is managed in main.
export function addScore(state, base) {
  state.score += base * state.combo;
  state.comboTimer = CFG.comboWindow;
}
