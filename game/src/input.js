// Keyboard + mouse state: one object the loop reads, so the game never touches
// DOM events outside this file. Also holds the scripted driver the screenshot
// mode uses, so a deterministic run can steer the ship without a real player.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    // When set, a function (frame, state) => {moveX, moveY, aimX, aimY, firing, dash}
    // replaces the real devices. Screenshot mode installs one, and the loop
    // copies each frame's answer into `drive` for the game to read.
    scripted: null,
    drive: null,

    attach() {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }
        input.keys.add(e.key.toLowerCase());
      });
      window.addEventListener('keyup', (e) => input.keys.delete(e.key.toLowerCase()));
      window.addEventListener('blur', () => input.keys.clear());
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        input.mouseX = e.clientX - r.left;
        input.mouseY = e.clientY - r.top;
      });
      canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) input.mouseDown = true;
      });
      window.addEventListener('mouseup', () => {
        input.mouseDown = false;
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    // Movement vector from WASD or the arrow keys, normalised.
    moveVector() {
      let x = 0;
      let y = 0;
      if (input.keys.has('a') || input.keys.has('arrowleft')) x -= 1;
      if (input.keys.has('d') || input.keys.has('arrowright')) x += 1;
      if (input.keys.has('w') || input.keys.has('arrowup')) y -= 1;
      if (input.keys.has('s') || input.keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },

    firing() {
      return input.mouseDown || input.keys.has(' ') || input.keys.has('j');
    },

    dashPressed() {
      return input.keys.has('shift') || input.keys.has('k');
    },

    pressed(key) {
      return input.keys.has(key);
    },
  };
  return input;
}
