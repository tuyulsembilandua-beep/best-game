// Particles, floating score text and screen shake: the feedback layer. Nothing
// here touches game logic; it only makes hits, deaths and pickups visible.

export function spawnBurst(state, x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= 420) return;
    const angle = state.rng.next() * Math.PI * 2;
    const v = speed * (0.3 + state.rng.next() * 0.7);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.5 + state.rng.next() * 0.5),
      maxLife: life,
      size: 1.5 + state.rng.next() * 2.5,
      color,
    });
  }
}

export function spawnText(state, x, y, text, color) {
  state.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
}

export function addShake(state, amount) {
  state.shake = Math.min(18, state.shake + amount);
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
  }
  for (let i = state.texts.length - 1; i >= 0; i--) {
    const t = state.texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) state.texts.splice(i, 1);
  }
  if (state.shake > 0) {
    state.shake = Math.max(0, state.shake - 26 * dt);
  }
}

export function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const t of state.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
