// Staged screenshot scenes for ?shot=start|play|power|end with &seed=N

import { createWorld, updateWorld, GAME_STATES, checkLineOfSight, isInVisionCone } from './heist-world.js';
import { CONFIG } from './config.js';
import { createInput } from './input.js';

/** Simple autopilot: steers toward nearest uncollected loot, then exit, avoiding vision cones. */
function autopilotStep(world, input, dt) {
  const { thief, lootItems, exit, guards, cameras, coverObjects, powerCut } = world;

  // Find target
  let targetX = null, targetY = null;
  let targetType = null;

  // Priority: uncollected loot (ledger first), then exit if has ledger
  for (const loot of lootItems) {
    if (!loot.collected) {
      if (loot.type === 'ledger' || targetType !== 'ledger') {
        targetX = loot.x;
        targetY = loot.y;
        targetType = loot.type;
      }
    }
  }

  if (targetX === null && thief.hasLedger && exit.unlocked) {
    targetX = exit.x;
    targetY = exit.y;
    targetType = 'exit';
  }

  if (targetX === null) return; // Nothing to do

  // Desired direction
  const dx = targetX - thief.x;
  const dy = targetY - thief.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 25) {
    // Close enough to interact
    input.interact = true;
    input.left = input.right = input.up = input.down = false;
    return;
  }

  // Test next position for safety
  const testSpeed = CONFIG.THIEF_SPEED * 0.5; // sneak speed for testing
  const nextX = thief.x + (dx / dist) * testSpeed * dt;
  const nextY = thief.y + (dy / dist) * testSpeed * dt;

  // Check if next position would be seen
  let wouldBeSeen = false;
  for (const guard of guards) {
    const coneMult = powerCut.active ? CONFIG.POWER_CUT_CONE_MULT : 1;
    const fov = CONFIG.GUARD_VISION_ANGLE * coneMult;
    const range = CONFIG.GUARD_VISION_RANGE * coneMult;
    if (isInVisionCone(guard.x, guard.y, guard.visionAngle, fov, range, nextX, nextY)) {
      if (checkLineOfSight(guard.x, guard.y, nextX, nextY, coverObjects)) {
        wouldBeSeen = true;
        break;
      }
    }
  }
  for (const cam of cameras) {
    if (!cam.active || cam.blind) continue;
    if (isInVisionCone(cam.x, cam.y, cam.currentAngle, CONFIG.CAMERA_VISION_ANGLE, CONFIG.CAMERA_VISION_RANGE, nextX, nextY)) {
      if (checkLineOfSight(cam.x, cam.y, nextX, nextY, coverObjects)) {
        wouldBeSeen = true;
        break;
      }
    }
  }

  if (wouldBeSeen) {
    // Try to sidestep: perpendicular to target direction
    const perpX = -dy / dist;
    const perpY = dx / dist;
    // Test both sides
    let safeX = 0, safeY = 0;
    let foundSafe = false;
    for (const side of [1, -1]) {
      const tx = thief.x + perpX * side * testSpeed * dt;
      const ty = thief.y + perpY * side * testSpeed * dt;
      let seen = false;
      for (const guard of guards) {
        const coneMult = powerCut.active ? CONFIG.POWER_CUT_CONE_MULT : 1;
        const fov = CONFIG.GUARD_VISION_ANGLE * coneMult;
        const range = CONFIG.GUARD_VISION_RANGE * coneMult;
        if (isInVisionCone(guard.x, guard.y, guard.visionAngle, fov, range, tx, ty)) {
          if (checkLineOfSight(guard.x, guard.y, tx, ty, coverObjects)) { seen = true; break; }
        }
      }
      for (const cam of cameras) {
        if (!cam.active || cam.blind) continue;
        if (isInVisionCone(cam.x, cam.y, cam.currentAngle, CONFIG.CAMERA_VISION_ANGLE, CONFIG.CAMERA_VISION_RANGE, tx, ty)) {
          if (checkLineOfSight(cam.x, cam.y, tx, ty, coverObjects)) { seen = true; break; }
        }
      }
      if (!seen) {
        safeX = perpX * side;
        safeY = perpY * side;
        foundSafe = true;
        break;
      }
    }
    if (foundSafe) {
      input.left = safeX < -0.1;
      input.right = safeX > 0.1;
      input.up = safeY < -0.1;
      input.down = safeY > 0.1;
      input.sneak = true;
    } else {
      // No safe path, just wait (sneak in place)
      input.sneak = true;
      input.left = input.right = input.up = input.down = false;
    }
  } else {
    // Safe to approach
    input.left = dx < -0.1;
    input.right = dx > 0.1;
    input.up = dy < -0.1;
    input.down = dy > 0.1;
    input.sneak = true;
  }
}

/** Runs the world forward for a given scenario and returns the world at the staged moment. */
export function stageScene(shot, seed = 1) {
  const world = createWorld(seed);
  const input = createInput();
  const dt = 1 / 60;

  // Attach dummy canvas for input (not actually used for autopilot)
  const dummyCanvas = document.createElement('canvas');
  dummyCanvas.width = CONFIG.FIELD_W;
  dummyCanvas.height = CONFIG.FIELD_H;
  input.attach(dummyCanvas);

  let frames = 0;
  const maxFrames = shot === 'start' ? 300 : shot === 'play' ? 300 : shot === 'power' ? 1200 : 3600; // 5s, 5s, 20s, 60s at 60fps
  let powerCutTriggered = false;

  // For 'start' shot: show title screen over room after 5s ambient patrol
  if (shot === 'start') {
    world.gameState = GAME_STATES.TITLE;
    // Run ambient patrol for 5 seconds (300 frames) without player
    for (let i = 0; i < 300; i++) {
      // Update guards only
      for (const guard of world.guards) {
        const target = guard.path[guard.waypointIndex];
        const gdx = target.x - guard.x;
        const gdy = target.y - guard.y;
        const gdist = Math.hypot(gdx, gdy);
        if (gdist < 5) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.path.length;
          guard.visionAngle = Math.atan2(gdy, gdx);
        } else {
          guard.x += (gdx / gdist) * guard.speed * dt;
          guard.y += (gdy / gdist) * guard.speed * dt;
          guard.visionAngle = Math.atan2(gdy, gdx);
        }
      }
      // Update cameras
      for (const cam of world.cameras) {
        cam.sweepOffset += CONFIG.CAMERA_SWEEP_SPEED * dt;
        cam.currentAngle = cam.baseAngle + Math.sin(cam.sweepOffset) * CONFIG.CAMERA_SWEEP_RANGE;
      }
      world.timing.gameTime += dt;
    }
    return world;
  }

  // For play, power, end: start the game
  world.startGame();

  while (frames < maxFrames && world.gameState === GAME_STATES.PLAY) {
    // Autopilot input
    const autoInput = {
      left: false, right: false, up: false, down: false,
      sneak: false, interact: false, throwCoin: false,
      powerCut: false, pause: false,
      mouseX: 0, mouseY: 0,
    };
    autopilotStep(world, autoInput, dt);

    // Trigger power cut at ~20s (1200 frames) for 'power' shot
    if (shot === 'power' && frames === 1200 && world.powerCut.available) {
      autoInput.powerCut = true;
      powerCutTriggered = true;
    }

    // Merge autopilot input with any manual input (none for staging)
    const mergedInput = { ...autoInput };

    updateWorld(world, dt, mergedInput);
    frames++;
  }

  // For 'end' shot, ensure we reached win state
  if (shot === 'end' && world.gameState !== GAME_STATES.WIN) {
    // Continue until win or timeout
    while (world.gameState === GAME_STATES.PLAY && frames < 7200) {
      const autoInput = {
        left: false, right: false, up: false, down: false,
        sneak: false, interact: false, throwCoin: false,
        powerCut: false, pause: false,
        mouseX: 0, mouseY: 0,
      };
      autopilotStep(world, autoInput, dt);
      updateWorld(world, dt, autoInput);
      frames++;
    }
  }

  input.detach(dummyCanvas);
  return world;
}

/** Injects the staged world into the running game for screenshot capture. */
export function applyStagedWorld(runningWorld, stagedWorld) {
  // Copy all relevant state
  Object.assign(runningWorld.thief, stagedWorld.thief);
  for (let i = 0; i < runningWorld.guards.length; i++) {
    Object.assign(runningWorld.guards[i], stagedWorld.guards[i]);
  }
  for (let i = 0; i < runningWorld.cameras.length; i++) {
    Object.assign(runningWorld.cameras[i], stagedWorld.cameras[i]);
  }
  for (let i = 0; i < runningWorld.lootItems.length; i++) {
    Object.assign(runningWorld.lootItems[i], stagedWorld.lootItems[i]);
  }
  Object.assign(runningWorld.exit, stagedWorld.exit);
  runningWorld.coins.length = 0;
  runningWorld.coins.push(...stagedWorld.coins);
  Object.assign(runningWorld.alarm, stagedWorld.alarm);
  Object.assign(runningWorld.powerCut, stagedWorld.powerCut);
  Object.assign(runningWorld.timing, stagedWorld.timing);
  Object.assign(runningWorld.score, stagedWorld.score);
  runningWorld.gameState = stagedWorld.gameState;
}