// Pickups: motes (the light every kill drops, feeding score and combo) and
// powerups (shield, rapid fire, spread shot). Motes drift toward the ship when
// it comes close, so collecting feels like pulling light in.

import { CFG } from './config.js';
import { spawnBurst, spawnText } from './particles.js';

export function updatePickups(state, dt) {
  const p = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.life -= dt;
    if (pk.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    pk.x += (pk.vx || 0) * dt;
    pk.y += (pk.vy || 0) * dt;
    if (pk.vx) pk.vx *= 1 - 3 * dt;
    if (pk.vy) pk.vy *= 1 - 3 * dt;

    if (!p.alive) continue;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const dist = Math.hypot(dx, dy);
    if (pk.kind === 'mote' && dist < CFG.moteMagnetRange) {
      pk.x += (dx / (dist || 1)) * CFG.moteMagnetSpeed * dt;
      pk.y += (dy / (dist || 1)) * CFG.moteMagnetSpeed * dt;
    }
    if (dist < p.radius + pk.radius + 4) {
      collectPickup(state, pk);
      state.pickups.splice(i, 1);
    }
  }
}

function collectPickup(state, pk) {
  const p = state.player;
  if (pk.kind === 'mote') {
    state.score += CFG.moteScore * state.combo;
    state.comboTimer = CFG.comboWindow;
    if (state.combo < CFG.comboMax) {
      state.combo = Math.min(CFG.comboMax, state.combo + 0.25);
    }
    spawnBurst(state, pk.x, pk.y, '#ffe066', 6, 120, 0.3);
    state.sfx.pickup();
    return;
  }
  if (pk.kind === 'shield') {
    p.shield = true;
    spawnText(state, p.x, p.y - 22, 'SHIELD', '#9df2ff');
  } else if (pk.kind === 'rapid') {
    p.rapidTimer = CFG.rapidDuration;
    spawnText(state, p.x, p.y - 22, 'RAPID FIRE', '#ffb347');
  } else if (pk.kind === 'spread') {
    p.spreadTimer = CFG.spreadDuration;
    spawnText(state, p.x, p.y - 22, 'SPREAD SHOT', '#ff8fd1');
  }
  spawnBurst(state, pk.x, pk.y, '#ffffff', 14, 180, 0.4);
  state.sfx.powerup();
}

export function drawPickups(ctx, state) {
  for (const pk of state.pickups) {
    const blink = pk.life < 3 ? (Math.sin(state.time * 10) > 0 ? 1 : 0.35) : 1;
    ctx.globalAlpha = blink;
    if (pk.kind === 'mote') {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7cc';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Powerups: a ring with a letter at the centre.
      const colors = { shield: '#9df2ff', rapid: '#ffb347', spread: '#ff8fd1' };
      const letters = { shield: 'S', rapid: 'R', spread: 'W' };
      ctx.strokeStyle = colors[pk.kind];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = colors[pk.kind];
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letters[pk.kind], pk.x, pk.y + 0.5);
    }
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}
