// Synthesised sound effects: every sound is built with the Web Audio API, so
// the game ships no audio files and makes no network request. The context is
// created lazily on the first user gesture (browsers block audio before one),
// and every call is a no-op until then, so headless runs stay silent.

export function createSfx() {
  const sfx = {
    ctx: null,
    muted: false,

    ensure() {
      if (sfx.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        sfx.ctx = new AC();
      } catch {
        sfx.ctx = null;
      }
    },

    unlock() {
      sfx.ensure();
      if (sfx.ctx && sfx.ctx.state === 'suspended') sfx.ctx.resume();
    },

    toggleMute() {
      sfx.muted = !sfx.muted;
      return sfx.muted;
    },

    // One short oscillator blip with an exponential decay.
    blip(freqStart, freqEnd, duration, type, volume) {
      if (sfx.muted || !sfx.ctx) return;
      try {
        const t = sfx.ctx.currentTime;
        const osc = sfx.ctx.createOscillator();
        const gain = sfx.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + duration);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain).connect(sfx.ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.02);
      } catch {
        // Audio is decoration; a failure never breaks the game.
      }
    },

    shoot() {
      sfx.blip(720, 240, 0.08, 'square', 0.05);
    },
    hit() {
      sfx.blip(180, 60, 0.12, 'sawtooth', 0.09);
    },
    explode() {
      sfx.blip(320, 40, 0.35, 'sawtooth', 0.14);
      sfx.blip(90, 30, 0.3, 'triangle', 0.12);
    },
    pickup() {
      sfx.blip(880, 1320, 0.09, 'sine', 0.08);
    },
    powerup() {
      sfx.blip(520, 1040, 0.16, 'sine', 0.1);
      sfx.blip(780, 1560, 0.16, 'sine', 0.07);
    },
    dash() {
      sfx.blip(300, 900, 0.12, 'sine', 0.07);
    },
    hurt() {
      sfx.blip(220, 55, 0.3, 'sawtooth', 0.16);
    },
    wave() {
      sfx.blip(440, 660, 0.14, 'triangle', 0.09);
      sfx.blip(660, 880, 0.14, 'triangle', 0.07);
    },
    gameOver() {
      sfx.blip(392, 392, 0.22, 'triangle', 0.1);
      sfx.blip(311, 311, 0.22, 'triangle', 0.1);
      sfx.blip(233, 110, 0.5, 'triangle', 0.12);
    },
  };
  return sfx;
}
