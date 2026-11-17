# Lumen Drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tuyulsembilandua-beep/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tuyulsembilandua-beep/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original neon arena survival game for [make.fun](https://make.fun/bounty/best-game-01)'s best-game-01 bounty: pilot the last light-ship, the Lumen, through escalating waves of shades. Destroy shades to drop motes of light — motes feed your score and raise a combo multiplier up to x5. Chasers hunt you, drifters weave, splitters burst into minis, and every fifth wave brings a Warden that shoots back. Dash through danger (briefly invulnerable), grab shield / rapid-fire / spread-shot powerups, and survive as long as you can. Three hits and the light goes out.

## Controls

- WASD / arrow keys — fly
- Mouse — aim, click / Space — fire
- Shift — dash (briefly invulnerable)
- P — pause, M — mute, R — restart after game over

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Plain static files under `game/` — no build step, no network request, no library. All sound is synthesised with the Web Audio API. Screenshots in `screenshots/` are deterministic renders of the game itself (`?shot=start|play|end&seed=1`).

## Files

- `game/index.html` — the page and canvas
- `game/src/main.js` — loop, state machine, collisions, waves
- `game/src/config.js` — all tuning in one place
- `game/src/player.js` — the Lumen: movement, dash, fire
- `game/src/enemies.js` — the five shades and the wave director
- `game/src/bullets.js`, `game/src/pickups.js`, `game/src/particles.js` — bolts, motes/powerups, feedback
- `game/src/render.js` — everything drawn, HUD and screens
- `game/src/input.js`, `game/src/audio.js`, `game/src/random.js`, `game/src/shots.js` — devices, synth SFX, seeded RNG, screenshot mode
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)

---

<sub>Entered on [make.fun](https://make.fun/?ref=h914r6pd&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
