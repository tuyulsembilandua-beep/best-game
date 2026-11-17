// Screenshot mode: `?shot=start|play|end&seed=N` renders one frozen moment of
// the game, deterministically, so the screenshots handed in are real renders of
// this code. The starter kit's shots.json maps screenshot names to these URLs.
// The game itself never depends on this file; it only steers the ship.

import { makeRng } from './random.js';
import { startWave } from './enemies.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  const kind = params.get('shot');
  if (!kind || !['start', 'play', 'end'].includes(kind)) return null;
  const seed = Number(params.get('seed') || '1') || 1;
  return { kind, seed };
}

// The scripted pilot: flies a slow loop around the centre, aims at the nearest
// shade and holds the trigger. In 'end' runs it never dashes and starts with
// one heart, so the run ends on the game-over screen.
export function driveShot(state, frame) {
  const p = state.player;
  const t = frame / 60;
  const kind = state.shot.kind;
  // Aim at the nearest shade, or at the centre when the field is empty.
  let aimX = state.w / 2;
  let aimY = state.h / 2;
  let best = Infinity;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) {
      best = d;
      aimX = e.x;
      aimY = e.y;
    }
  }
  // In an 'end' run the pilot flies straight at the nearest shade, so the run
  // ends on the game-over screen; otherwise it flies a slow loop and survives.
  let moveX;
  let moveY;
  if (kind === 'end' && best < Infinity) {
    const dx = aimX - p.x;
    const dy = aimY - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    moveX = dx / dist;
    moveY = dy / dist;
  } else {
    const cx = state.w / 2 + Math.cos(t * 0.5) * state.w * 0.22;
    const cy = state.h / 2 + Math.sin(t * 0.7) * state.h * 0.22;
    const dx = cx - p.x;
    const dy = cy - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    moveX = dx / dist;
    moveY = dy / dist;
  }
  // In a 'play' run the pilot fires in bursts and aims with a slight wobble,
  // so shades accumulate on the field and the frozen frame shows the game at
  // its busiest instead of an empty arena the pilot already cleared.
  const burstFire = kind === 'play' ? frame % 120 < 60 : kind !== 'start';
  const wobble = kind === 'play' ? Math.sin(frame * 0.05) * 46 : 0;
  return {
    moveX,
    moveY,
    aimX: aimX + wobble,
    aimY: aimY - wobble * 0.5,
    firing: burstFire,
    dash: kind === 'play' && frame % 420 === 210,
  };
}

export function setupShot(state, shot) {
  state.shot = shot;
  state.rng = makeRng(shot.seed);
  // Decorate the title with a few drifting shades and motes.
  if (shot.kind === 'start') {
    for (let i = 0; i < 5; i++) {
      state.enemies.push({
        kind: state.rng.pick(['chaser', 'drifter']),
        x: state.rng.range(60, state.w - 60),
        y: state.rng.range(60, state.h - 60),
        vx: 0,
        vy: 0,
        radius: 13,
        hp: 1,
        maxHp: 1,
        speed: 20,
        score: 0,
        phase: state.rng.next() * Math.PI * 2,
        fireTimer: 99,
        flash: 0,
        decorative: true,
      });
    }
    for (let i = 0; i < 8; i++) {
      state.pickups.push({
        kind: 'mote',
        x: state.rng.range(40, state.w - 40),
        y: state.rng.range(40, state.h - 40),
        vx: 0,
        vy: 0,
        life: 999,
        radius: 6,
      });
    }
    state.mode = 'title';
    return;
  }
  // Play and end: a real game, driven by the scripted pilot.
  state.mode = 'playing';
  if (shot.kind === 'end') state.player.hp = 1;
  startWave(state, shot.kind === 'end' ? 3 : 3);
}

// How many fixed 1/60s steps a shot runs before it freezes. 'end' runs until
// the ship is destroyed (or the cap), then a few frames more for the burst.
export function shotTargetFrames(state) {
  if (state.shot.kind === 'start') return 150;
  if (state.shot.kind === 'play') return 960; // 16 seconds of play, wave 3 busy
  return 3600; // end: cap at 60 seconds
}
