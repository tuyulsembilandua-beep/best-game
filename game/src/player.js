// The Lumen: the player's light-ship. Movement with acceleration and damping,
// a dash with a cooldown and brief invulnerability, and aimed fire. The ship
// points at the mouse; on touch devices it fires toward its movement.

import { CFG } from './config.js';
import { spawnBurst, addShake } from './particles.js';

export function createPlayer(w, h) {
  return {
    x: w / 2,
    y: h / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hp: CFG.playerMaxHp,
    maxHp: CFG.playerMaxHp,
    dashCooldown: 0,
    dashTime: 0,
    invuln: 0,
    fireCooldown: 0,
    shield: false,
    rapidTimer: 0,
    spreadTimer: 0,
    alive: true,
  };
}

export function updatePlayer(state, dt) {
  const p = state.player;
  if (!p.alive) return;
  const input = state.input;
  const drive = input.drive || null;

  // Aim: at the mouse, or at the scripted pilot's target.
  const aim = drive ? { x: drive.aimX, y: drive.aimY } : { x: input.mouseX, y: input.mouseY };
  p.angle = Math.atan2(aim.y - p.y, aim.x - p.x);

  // Timers tick down.
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.rapidTimer = Math.max(0, p.rapidTimer - dt);
  p.spreadTimer = Math.max(0, p.spreadTimer - dt);

  // Dash: a burst of speed in the movement direction (or the facing direction
  // when standing still), with a short window of invulnerability.
  const dashWant = drive ? drive.dash : input.dashPressed();
  if (dashWant && p.dashCooldown <= 0 && p.dashTime <= 0) {
    const mv = drive ? { x: drive.moveX, y: drive.moveY } : input.moveVector();
    const dx = mv.x !== 0 || mv.y !== 0 ? mv.x : Math.cos(p.angle);
    const dy = mv.x !== 0 || mv.y !== 0 ? mv.y : Math.sin(p.angle);
    p.vx = dx * CFG.dashSpeed;
    p.vy = dy * CFG.dashSpeed;
    p.dashTime = CFG.dashTime;
    p.dashCooldown = CFG.dashCooldown;
    p.invuln = Math.max(p.invuln, CFG.dashInvuln);
    spawnBurst(state, p.x, p.y, '#7df9ff', 10, 160, 0.35);
    state.sfx.dash();
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
  } else {
    // Normal movement: accelerate toward the input direction, damp the rest.
    const mv = drive ? { x: drive.moveX, y: drive.moveY } : input.moveVector();
    p.vx += mv.x * CFG.playerAccel * dt;
    p.vy += mv.y * CFG.playerAccel * dt;
    const damp = Math.max(0, 1 - CFG.playerFriction * dt);
    p.vx *= damp;
    p.vy *= damp;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > CFG.playerSpeed) {
      p.vx = (p.vx / speed) * CFG.playerSpeed;
      p.vy = (p.vy / speed) * CFG.playerSpeed;
    }
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  // Stay inside the arena, bouncing softly off the walls.
  const r = CFG.playerRadius;
  if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx) * 0.4; }
  if (p.x > state.w - r) { p.x = state.w - r; p.vx = -Math.abs(p.vx) * 0.4; }
  if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy) * 0.4; }
  if (p.y > state.h - r) { p.y = state.h - r; p.vy = -Math.abs(p.vy) * 0.4; }

  // Fire: hold to shoot toward the aim point; spread shot adds two side bolts.
  const firing = drive ? drive.firing : input.firing();
  const interval = p.rapidTimer > 0 ? CFG.rapidFireInterval : CFG.fireInterval;
  if (firing && p.fireCooldown <= 0) {
    p.fireCooldown = interval;
    const angles = p.spreadTimer > 0 ? [-0.22, 0, 0.22] : [0];
    for (const off of angles) {
      const a = p.angle + off;
      state.bullets.push({
        x: p.x + Math.cos(a) * (r + 6),
        y: p.y + Math.sin(a) * (r + 6),
        vx: Math.cos(a) * CFG.bulletSpeed,
        vy: Math.sin(a) * CFG.bulletSpeed,
        life: CFG.bulletLife,
        radius: CFG.bulletRadius,
        friendly: true,
      });
    }
    state.sfx.shoot();
  }
}

// The ship takes a hit: a shield absorbs it, otherwise a heart is lost and the
// ship is briefly invulnerable. Returns true when the ship was destroyed.
export function hurtPlayer(state) {
  const p = state.player;
  if (!p.alive || p.invuln > 0 || p.dashTime > 0) return false;
  if (p.shield) {
    p.shield = false;
    p.invuln = 0.9;
    spawnBurst(state, p.x, p.y, '#9df2ff', 16, 220, 0.5);
    state.sfx.hit();
    return false;
  }
  p.hp -= 1;
  p.invuln = 1.2;
  addShake(state, CFG.shakeOnHit);
  spawnBurst(state, p.x, p.y, '#ff5d73', 22, 260, 0.6);
  state.sfx.hurt();
  if (p.hp <= 0) {
    p.alive = false;
    addShake(state, CFG.shakeOnDeath);
    spawnBurst(state, p.x, p.y, '#ffe066', 46, 320, 0.9);
    spawnBurst(state, p.x, p.y, '#7df9ff', 30, 200, 0.8);
    state.sfx.explode();
    return true;
  }
  return false;
}
