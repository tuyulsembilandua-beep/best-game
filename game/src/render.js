// Everything the player sees: the arena, the ship, the shades, the HUD and the
// title / pause / game-over screens. All drawing lives here and nowhere else,
// so the game's look is one file to tune.

import { CFG } from './config.js';
import { drawParticles } from './particles.js';
import { drawBullets } from './bullets.js';
import { drawPickups } from './pickups.js';

const PALETTE = {
  bg: '#05060f',
  grid: 'rgba(125, 249, 255, 0.05)',
  player: '#7df9ff',
  playerCore: '#ffffff',
  chaser: '#ff5d73',
  drifter: '#ff9f43',
  splitter: '#ff6b9d',
  mini: '#ff8fa3',
  warden: '#c77dff',
  text: '#e8f6ff',
  dim: '#8fa8bf',
  gold: '#ffe066',
};

function drawBackground(ctx, state) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, state.w, state.h);
  // Faint grid, drifting slowly so the arena feels alive even standing still.
  const off = (state.time * 6) % 48;
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -off; x < state.w; x += 48) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.h);
  }
  for (let y = -off; y < state.h; y += 48) {
    ctx.moveTo(0, y);
    ctx.lineTo(state.w, y);
  }
  ctx.stroke();
  // Stars: fixed points in normalised coordinates, twinkling with time.
  for (const s of state.stars) {
    ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(state.time * s.tw + s.ph));
    ctx.fillStyle = '#cfe9ff';
    ctx.fillRect(s.x * state.w, s.y * state.h, s.r, s.r);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (!p.alive) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Blink while invulnerable after a hit.
  if (p.invuln > 0 && Math.floor(state.time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
  // Shield ring.
  if (p.shield) {
    ctx.strokeStyle = 'rgba(157, 242, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, CFG.playerRadius + 7 + Math.sin(state.time * 5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Dash trail.
  if (p.dashTime > 0) {
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-p.vx * 0.06, -p.vy * 0.06);
    ctx.stroke();
  }
  // The ship: a dart pointing along its aim, with a glowing core.
  ctx.rotate(p.angle);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, state, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0;
  const body = flash ? '#ffffff' : PALETTE[e.kind];
  if (e.kind === 'chaser' || e.kind === 'mini') {
    // A spiked shade: a diamond with a dark eye.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -e.radius);
    ctx.lineTo(e.radius, 0);
    ctx.lineTo(0, e.radius);
    ctx.lineTo(-e.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a0b12';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'drifter') {
    // A ring that spins slowly.
    ctx.rotate(state.time * 1.5 + e.phase);
    ctx.strokeStyle = body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = body;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * e.radius, Math.sin(a) * e.radius, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (e.kind === 'splitter') {
    // A hex cell with a pulsing core.
    const pulse = 1 + Math.sin(state.time * 6 + e.phase) * 0.12;
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + e.phase;
      const px = Math.cos(a) * e.radius * pulse;
      const py = Math.sin(a) * e.radius * pulse;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd6e2';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'warden') {
    // The warden: a large crowned shade with a health ring.
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + state.time * 0.4;
      const rad = k % 2 === 0 ? e.radius : e.radius * 0.62;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a0a3d';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0d0ff';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Health ring.
    ctx.strokeStyle = 'rgba(240, 208, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 7, -Math.PI / 2, -Math.PI / 2 + (e.hp / e.maxHp) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, state) {
  const p = state.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // Score, big and top-left.
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(String(state.score).padStart(6, '0'), 18, 14);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`WAVE ${state.wave}`, 18, 46);
  // Combo multiplier, gold while it is above x1.
  if (state.combo > 1) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`COMBO x${state.combo.toFixed(1)}`, 18, 66);
  }
  // Hearts, top-right.
  const heart = (x, y, filled) => {
    ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255, 93, 115, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.bezierCurveTo(x, y, x - 6, y - 4, x - 9, y + 1);
    ctx.bezierCurveTo(x - 12, y + 6, x - 6, y + 11, x, y + 14);
    ctx.bezierCurveTo(x + 6, y + 11, x + 12, y + 6, x + 9, y + 1);
    ctx.bezierCurveTo(x + 6, y - 4, x, y, x, y + 5);
    ctx.fill();
  };
  for (let i = 0; i < p.maxHp; i++) {
    heart(state.w - 30 - i * 26, 16, i < p.hp);
  }
  // Dash cooldown bar under the hearts.
  const dashFrac = 1 - p.dashCooldown / CFG.dashCooldown;
  ctx.fillStyle = 'rgba(125, 249, 255, 0.25)';
  ctx.fillRect(state.w - 108, 40, 90, 6);
  ctx.fillStyle = dashFrac >= 1 ? '#7df9ff' : '#3d7f8c';
  ctx.fillRect(state.w - 108, 40, 90 * dashFrac, 6);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('DASH [SHIFT]', state.w - 18, 50);
  ctx.textAlign = 'left';
  // Active powerup timers, bottom-left.
  let py = state.h - 24;
  ctx.font = 'bold 13px system-ui, sans-serif';
  if (p.shield) {
    ctx.fillStyle = '#9df2ff';
    ctx.fillText('SHIELD', 18, py);
    py -= 20;
  }
  if (p.rapidTimer > 0) {
    ctx.fillStyle = '#ffb347';
    ctx.fillText(`RAPID ${Math.ceil(p.rapidTimer)}s`, 18, py);
    py -= 20;
  }
  if (p.spreadTimer > 0) {
    ctx.fillStyle = '#ff8fd1';
    ctx.fillText(`SPREAD ${Math.ceil(p.spreadTimer)}s`, 18, py);
    py -= 20;
  }
  // Best score, bottom-right.
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`BEST ${state.best}`, state.w - 18, state.h - 24);
  ctx.textAlign = 'left';
  // Wave banner.
  if (state.waveBanner > 0) {
    ctx.globalAlpha = Math.min(1, state.waveBanner);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${state.wave}`, state.w / 2, state.h / 2 - 90);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(state.wave % CFG.wardenEvery === 0 ? 'The Warden approaches…' : 'Survive the shades', state.w / 2, state.h / 2 - 48);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.55)';
  ctx.fillRect(0, 0, state.w, state.h);
  const cx = state.w / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7df9ff';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('LUMEN DRIFT', cx, state.h * 0.26);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Pilot the last light-ship. Gather the motes. Outlast the dark.', cx, state.h * 0.26 + 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px system-ui, sans-serif';
  const lines = [
    'WASD / ARROWS — fly      MOUSE — aim      CLICK / SPACE — fire',
    'SHIFT — dash (briefly invulnerable)      P — pause      M — mute',
    'Destroy shades to drop motes: motes raise your combo up to x5.',
    'Every 5th wave brings a Warden. Three hits and the light goes out.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, cx, state.h * 0.44 + i * 26));
  // Pulsing start prompt.
  ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', cx, state.h * 0.68);
  ctx.globalAlpha = 1;
  if (state.best > 0) {
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`BEST SCORE ${state.best}`, cx, state.h * 0.68 + 36);
  }
  ctx.textAlign = 'left';
}

function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.6)';
  ctx.fillRect(0, 0, state.w, state.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('PAUSED', state.w / 2, state.h / 2 - 20);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Press P to resume', state.w / 2, state.h / 2 + 24);
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.62)';
  ctx.fillRect(0, 0, state.w, state.h);
  const cx = state.w / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d73';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('SIGNAL LOST', cx, state.h * 0.3);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(`SCORE  ${state.score}`, cx, state.h * 0.3 + 62);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(`Reached wave ${state.wave}  ·  Best ${Math.max(state.best, state.score)}`, cx, state.h * 0.3 + 100);
  if (state.score >= state.best && state.score > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('NEW BEST!', cx, state.h * 0.3 + 132);
  }
  ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', cx, state.h * 0.3 + 184);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function draw(ctx, state) {
  ctx.save();
  if (state.shake > 0.2) {
    ctx.translate(
      (state.rng.next() - 0.5) * state.shake,
      (state.rng.next() - 0.5) * state.shake,
    );
  }
  drawBackground(ctx, state);
  drawPickups(ctx, state);
  for (const e of state.enemies) drawEnemy(ctx, state, e);
  drawBullets(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  ctx.restore();
  if (state.mode === 'playing' || state.mode === 'paused') drawHud(ctx, state);
  if (state.mode === 'title') drawTitle(ctx, state);
  if (state.mode === 'paused') drawPaused(ctx, state);
  if (state.mode === 'over') drawGameOver(ctx, state);
}
