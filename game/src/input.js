// Input handling: keyboard, mouse, and game actions.

export const INPUT_STATE = {
  left: false,
  right: false,
  up: false,
  down: false,
  sneak: false,
  interact: false,
  throwCoin: false,
  powerCut: false,
  pause: false,
  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  justPressed: new Set(),
};

const KEY_MAP = {
  'KeyW': 'up',
  'ArrowUp': 'up',
  'KeyS': 'down',
  'ArrowDown': 'down',
  'KeyA': 'left',
  'ArrowLeft': 'left',
  'KeyD': 'right',
  'ArrowRight': 'right',
  'ShiftLeft': 'sneak',
  'ShiftRight': 'sneak',
  'KeyE': 'interact',
  'KeyQ': 'powerCut',
  'KeyP': 'pause',
  'Escape': 'pause',
  'Space': 'start',
};

export function createInput() {
  const state = { ...INPUT_STATE, justPressed: new Set() };

  function onKeyDown(e) {
    const action = KEY_MAP[e.code];
    if (action) {
      if (action === 'start') {
        state.justPressed.add('start');
      } else if (action === 'interact') {
        state.justPressed.add('interact');
        state.interact = true;
      } else if (action === 'throwCoin') {
        // not used, mouse handles this
      } else if (action === 'powerCut') {
        state.justPressed.add('powerCut');
        state.powerCut = true;
      } else if (action === 'pause') {
        state.justPressed.add('pause');
      } else if (action === 'sneak') {
        state.sneak = true;
      } else {
        state[action] = true;
      }
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    const action = KEY_MAP[e.code];
    if (action) {
      if (action === 'interact') {
        state.interact = false;
      } else if (action === 'powerCut') {
        state.powerCut = false;
      } else if (action === 'sneak') {
        state.sneak = false;
      } else if (action !== 'start' && action !== 'pause') {
        state[action] = false;
      }
    }
  }

  function onMouseMove(e) {
    const rect = e.target.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
  }

  function onMouseDown(e) {
    if (e.button === 0) {
      state.mouseDown = true;
      state.justPressed.add('throwCoin');
      state.throwCoin = true;
    }
    e.preventDefault();
  }

  function onMouseUp(e) {
    if (e.button === 0) {
      state.mouseDown = false;
      state.throwCoin = false;
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  function onBlur() {
    // Release all keys on blur
    state.left = state.right = state.up = state.down = state.sneak = false;
    state.interact = state.throwCoin = state.powerCut = false;
    state.mouseDown = false;
  }

  function attach(canvas) {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onBlur);
  }

  function detach(canvas) {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('blur', onBlur);
  }

  function poll() {
    // Return current state for game update
    const snapshot = {
      left: state.left,
      right: state.right,
      up: state.up,
      down: state.down,
      sneak: state.sneak,
      interact: state.interact,
      throwCoin: state.throwCoin,
      powerCut: state.powerCut,
      pause: state.pause,
      mouseX: state.mouseX,
      mouseY: state.mouseY,
      justPressed: new Set(state.justPressed),
    };
    // Clear one-shot actions
    state.justPressed.clear();
    state.interact = false; // interact is single-press
    state.powerCut = false; // powerCut is single-press
    state.pause = false;
    return snapshot;
  }

  function consumeStart() {
    if (state.justPressed.has('start')) {
      state.justPressed.delete('start');
      return true;
    }
    return false;
  }

  function consumePause() {
    if (state.justPressed.has('pause')) {
      state.justPressed.delete('pause');
      return true;
    }
    return false;
  }

  return { state, attach, detach, poll, consumeStart, consumePause };
}