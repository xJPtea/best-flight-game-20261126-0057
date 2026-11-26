// Skyline Courier — keyboard and mouse input. The game reads this one
// object each frame; it never touches event listeners anywhere else.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    // Mouse position in canvas pixels, and whether a button is held.
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    // Edge-triggered presses, consumed by the game once per frame.
    pressed: new Set(),
  };

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!keys.has(name)) state.pressed.add(name);
    keys.add(name);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
    state.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    state.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (event) => {
    state.mouseDown = true;
    if (!state.pressed.has('mouse')) state.pressed.add('mouse');
    event.preventDefault();
  });
  window.addEventListener('mouseup', () => {
    state.mouseDown = false;
  });

  return state;
}

// Read helpers the game loop uses. `held` is true while a key is down;
// `tapped` is true only on the frame the key went down.
export function held(input, ...names) {
  return names.some((n) => input.keys.has(n));
}

export function tapped(input, ...names) {
  return names.some((n) => input.pressed.has(n));
}

export function endFrame(input) {
  input.pressed.clear();
}
