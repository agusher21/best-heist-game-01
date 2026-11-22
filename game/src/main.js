// Game boot, fixed 1/60s step loop, screens, ?shot= handling, __shotReady.

import { CONFIG } from './config.js';
import { createWorld, updateWorld, GAME_STATES } from './heist-world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageScene, applyStagedWorld } from './shots.js';

// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = parseInt(params.get('seed') || '1', 10);

// Canvas setup
const canvas = document.getElementById('game');
canvas.width = CONFIG.FIELD_W;
canvas.height = CONFIG.FIELD_H;

// Game systems
const world = createWorld(seed);
const input = createInput();
const renderer = createRenderer(canvas);
const audio = createAudio();

// Attach input
input.attach(canvas);

// Footstep timer
let footstepTimer = 0;
const FOOTSTEP_INTERVAL = 0.35; // seconds

// Fixed timestep
const FIXED_DT = 1 / 60;
let accumulator = 0;
let lastTime = performance.now() / 1000;
let frameCount = 0;

// Shot handling
let shotFrozen = false;

// Initialize function that runs after page load
function init() {
  if (shot) {
    const stagedWorld = stageScene(shot, seed);
    applyStagedWorld(world, stagedWorld);
    // Paint twice to ensure clean frame
    renderer.render(world);
    renderer.render(world);
    window.__shotReady = true;
    shotFrozen = true;
  }
  
  audio.init();
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  const now = timestamp / 1000;
  const frameTime = Math.min(now - lastTime, 0.1);
  lastTime = now;
  accumulator += frameTime;

  // Input polling (skip during shot)
  const userInput = shotFrozen
    ? { left: false, right: false, up: false, down: false, sneak: false, interact: false, throwCoin: false, powerCut: false, pause: false, mouseX: 0, mouseY: 0, justPressed: new Set() }
    : input.poll();

  // Handle start/restart from title/caught/win screens (only when not in shot mode)
  if (!shotFrozen && (world.gameState === GAME_STATES.TITLE || world.gameState === GAME_STATES.CAUGHT || world.gameState === GAME_STATES.WIN)) {
    if (input.consumeStart() || userInput.justPressed.has('start')) {
      world.reset();
      world.startGame();
      audio.startAmbient();
    }
  }

  // Handle pause (only when not in shot mode)
  if (!shotFrozen) {
    if (world.gameState === GAME_STATES.PLAY && input.consumePause()) {
      world.pause();
    } else if (world.gameState === GAME_STATES.PAUSED && input.consumePause()) {
      world.resume();
    }
  }

  // Fixed step updates (skip when shot is frozen)
  if (!shotFrozen) {
    while (accumulator >= FIXED_DT) {
      if (world.gameState === GAME_STATES.PLAY) {
        updateWorld(world, FIXED_DT, userInput);

        // Footstep sounds
        const { thief } = world;
        const moving = userInput.left || userInput.right || userInput.up || userInput.down;
        if (moving && !thief.caught) {
          footstepTimer += FIXED_DT;
          if (footstepTimer >= FOOTSTEP_INTERVAL * (thief.sneaking ? 2 : 1)) {
            if (thief.sneaking) audio.playSneakStep();
            else audio.playFootstep();
            footstepTimer = 0;
          }
        }
      }
      accumulator -= FIXED_DT;
      frameCount++;
    }
  }

  // Render
  renderer.render(world);

  // Continue loop (but frozen for shots)
  requestAnimationFrame(gameLoop);
}

// Start after page load
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

// Expose for debugging
window.__gameWorld = world;
window.__gameInput = input;