// Bullets, both ways: the ship's bolts and the warden's orbs. Movement and
// lifetime here; hits are resolved in main.js, which owns the score.

export function updateBullets(state, dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -20 || b.x > state.w + 20 || b.y < -20 || b.y > state.h + 20) {
      state.bullets.splice(i, 1);
    }
  }
  for (let i = state.ebullets.length - 1; i >= 0; i--) {
    const b = state.ebullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -20 || b.x > state.w + 20 || b.y < -20 || b.y > state.h + 20) {
      state.ebullets.splice(i, 1);
    }
  }
}

export function drawBullets(ctx, state) {
  for (const b of state.bullets) {
    ctx.fillStyle = '#aef3ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of state.ebullets) {
    ctx.fillStyle = '#c77dff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0d0ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
