// Lumen Drift tuning: every number that shapes how the game feels lives here,
// so balancing the game means editing this file, not hunting through the code.

export const CFG = {
  // Arena: the canvas fills the window; the game reads its size at runtime.
  playerRadius: 12,
  playerSpeed: 265, // px per second
  playerAccel: 2400,
  playerFriction: 6.5, // velocity damping per second
  playerMaxHp: 3,

  dashSpeed: 640,
  dashTime: 0.16, // seconds of dash
  dashCooldown: 1.6,
  dashInvuln: 0.28, // seconds of invulnerability after a dash starts

  bulletSpeed: 560,
  bulletRadius: 4,
  bulletLife: 1.1,
  fireInterval: 0.16, // seconds between shots
  rapidFireInterval: 0.075,
  rapidDuration: 8, // seconds a rapid-fire pickup lasts
  spreadDuration: 8, // seconds a spread-shot pickup lasts

  enemyBulletSpeed: 170,
  enemyBulletRadius: 5,

  moteRadius: 6,
  moteMagnetRange: 130, // motes drift to the player inside this range
  moteMagnetSpeed: 340,
  moteScore: 25,
  comboPerMote: 1, // combo steps gained per mote
  comboMax: 5, // combo multiplier caps at x5
  comboWindow: 4, // seconds before the combo starts to decay

  // Waves: wave n fields 6 + 3n shades, spawned over time.
  waveBaseCount: 6,
  wavePerLevel: 3,
  spawnInterval: 1.15, // seconds between spawns at wave 1
  spawnIntervalMin: 0.32,
  wardenEvery: 5, // a warden (mini-boss) leads every 5th wave

  // Enemy tuning by kind: speed, radius, hp, score.
  kinds: {
    chaser: { speed: 95, radius: 13, hp: 1, score: 50 },
    drifter: { speed: 70, radius: 14, hp: 2, score: 75 },
    splitter: { speed: 55, radius: 18, hp: 3, score: 100 },
    mini: { speed: 150, radius: 8, hp: 1, score: 25 },
    warden: { speed: 42, radius: 30, hp: 26, score: 500 },
  },

  // Presentation.
  shakeDecay: 26, // shake magnitude lost per second
  shakeOnHit: 7,
  shakeOnDeath: 14,
  particleCap: 420,
};
