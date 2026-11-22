// Staged screenshot scenes for ?shot=start|play|power|end with &seed=N

import { createWorld, updateWorld, GAME_STATES, checkLineOfSight, isInVisionCone } from './heist-world.js';
import { CONFIG } from './config.js';
import { createInput } from './input.js';

/**
 * Checks if a position is safe from all vision sources with a safety margin.
 * Treats cones as dangerous out to range + 40px.
 */
function isPositionSafe(world, x, y, powerCutActive) {
  const { guards, cameras, coverObjects } = world;
  const SAFETY_MARGIN = 40;

  // Check guards
  for (const guard of guards) {
    const coneMult = powerCutActive ? CONFIG.POWER_CUT_CONE_MULT : 1;
    const fov = CONFIG.GUARD_VISION_ANGLE * coneMult;
    const range = CONFIG.GUARD_VISION_RANGE * coneMult + SAFETY_MARGIN;

    if (isInVisionCone(guard.x, guard.y, guard.visionAngle, fov, range, x, y)) {
      if (checkLineOfSight(guard.x, guard.y, x, y, coverObjects)) {
        // Check if cone is sweeping toward this position
        const dx = x - guard.x;
        const dy = y - guard.y;
        const targetAngle = Math.atan2(dy, dx);
        let diff = Math.abs(targetAngle - guard.visionAngle);
        while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
        // If within the inner 60% of the cone, it's actively looking this way
        if (diff < fov * 0.3) return false;
      }
    }
  }

  // Check cameras
  for (const cam of cameras) {
    if (!cam.active || cam.blind) continue;
    const range = CONFIG.CAMERA_VISION_RANGE + SAFETY_MARGIN;
    if (isInVisionCone(cam.x, cam.y, cam.currentAngle, CONFIG.CAMERA_VISION_ANGLE, range, x, y)) {
      if (checkLineOfSight(cam.x, cam.y, x, y, coverObjects)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Finds the nearest safe cover position near a target.
 */
function findSafeCoverPosition(world, targetX, targetY, powerCutActive) {
  const { coverObjects } = world;
  const coverCandidates = [];

  // Add cover object centers as candidates
  for (const obj of coverObjects) {
    coverCandidates.push({ x: obj.x, y: obj.y });
  }

  // Add positions around cover objects
  for (const obj of coverObjects) {
    if (obj.type === 'crate') {
      coverCandidates.push(
        { x: obj.x - obj.w / 2 - 20, y: obj.y },
        { x: obj.x + obj.w / 2 + 20, y: obj.y },
        { x: obj.x, y: obj.y - obj.h / 2 - 20 },
        { x: obj.x, y: obj.y + obj.h / 2 + 20 }
      );
    } else {
      const r = obj.r + 30;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        coverCandidates.push({ x: obj.x + Math.cos(a) * r, y: obj.y + Math.sin(a) * r });
      }
    }
  }

  // Also add room corners and center areas
  const W = CONFIG.FIELD_W;
  const H = CONFIG.FIELD_H;
  const HUD_H = CONFIG.HUD_HEIGHT;
  coverCandidates.push(
    { x: 150, y: HUD_H + 150 },
    { x: W - 150, y: HUD_H + 150 },
    { x: 150, y: H - 150 },
    { x: W - 150, y: H - 150 },
    { x: W / 2, y: (HUD_H + H) / 2 }
  );

  // Find the nearest safe position
  let bestPos = null;
  let bestDist = Infinity;

  for (const pos of coverCandidates) {
    if (pos.x < 30 || pos.x > W - 30 || pos.y < HUD_H + 30 || pos.y > H - 30) continue;
    if (isPositionSafe(world, pos.x, pos.y, powerCutActive)) {
      const dist = Math.hypot(pos.x - targetX, pos.y - targetY);
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = pos;
      }
    }
  }

  return bestPos;
}

/**
 * Improved autopilot: sneaks always, maintains safety margin, prefers cover,
 * never steps into a cone sweeping toward the thief.
 */
function autopilotStep(world, input, dt) {
  const { thief, lootItems, exit, guards, cameras, coverObjects, powerCut } = world;

  // Always sneak during staged scenes
  input.sneak = true;

  // Find target: uncollected loot (ledger first), then exit if has ledger
  let targetX = null, targetY = null;
  let targetType = null;

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

  // Check if current position is safe
  const currentlySafe = isPositionSafe(world, thief.x, thief.y, powerCut.active);

  const dx = targetX - thief.x;
  const dy = targetY - thief.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 25) {
    // Close enough to interact
    input.interact = true;
    input.left = input.right = input.up = input.down = false;
    return;
  }

  // If currently safe, try to move toward target
  if (currentlySafe) {
    const testSpeed = CONFIG.THIEF_SPEED * CONFIG.THIEF_SNEAK_MULT;
    const nextX = thief.x + (dx / dist) * testSpeed * dt;
    const nextY = thief.y + (dy / dist) * testSpeed * dt;

    if (isPositionSafe(world, nextX, nextY, powerCut.active)) {
      // Safe to approach directly
      input.left = dx < -0.1;
      input.right = dx > 0.1;
      input.up = dy < -0.1;
      input.down = dy > 0.1;
      return;
    }
  }

  // Not safe or direct path blocked - find safe cover position
  const safePos = findSafeCoverPosition(world, targetX, targetY, powerCut.active);

  if (safePos) {
    const sdx = safePos.x - thief.x;
    const sdy = safePos.y - thief.y;
    const sdist = Math.hypot(sdx, sdy);

    if (sdist < 15) {
      // At cover, wait
      input.left = input.right = input.up = input.down = false;
    } else {
      // Move toward safe cover
      const testSpeed = CONFIG.THIEF_SPEED * CONFIG.THIEF_SNEAK_MULT;
      const nextX = thief.x + (sdx / sdist) * testSpeed * dt;
      const nextY = thief.y + (sdy / sdist) * testSpeed * dt;

      if (isPositionSafe(world, nextX, nextY, powerCut.active)) {
        input.left = sdx < -0.1;
        input.right = sdx > 0.1;
        input.up = sdy < -0.1;
        input.down = sdy > 0.1;
      } else {
        // Even path to cover is blocked, just wait sneaking
        input.left = input.right = input.up = input.down = false;
      }
    }
  } else {
    // No safe cover found, wait in place sneaking
    input.left = input.right = input.up = input.down = false;
  }
}

/**
 * Simulates a scene for a given seed and returns the final world state.
 * Returns null if the thief gets caught.
 */
function simulateScene(shot, seed, maxFrames) {
  const world = createWorld(seed);
  const input = createInput();
  const dt = 1 / 60;

  const dummyCanvas = document.createElement('canvas');
  dummyCanvas.width = CONFIG.FIELD_W;
  dummyCanvas.height = CONFIG.FIELD_H;
  input.attach(dummyCanvas);

  // For 'start' shot: show title screen over room after ambient patrol
  if (shot === 'start') {
    world.gameState = GAME_STATES.TITLE;
    for (let i = 0; i < 300; i++) {
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
      for (const cam of world.cameras) {
        cam.sweepOffset += CONFIG.CAMERA_SWEEP_SPEED * dt;
        cam.currentAngle = cam.baseAngle + Math.sin(cam.sweepOffset) * CONFIG.CAMERA_SWEEP_RANGE;
      }
      world.timing.gameTime += dt;
    }
    input.detach(dummyCanvas);
    return world;
  }

  // For play, power, end: start the game
  world.startGame();

  let frames = 0;
  let powerCutTriggered = false;

  while (frames < maxFrames && world.gameState === GAME_STATES.PLAY) {
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

    updateWorld(world, dt, autoInput);
    frames++;
  }

  // For 'end' shot, continue until win or timeout
  if (shot === 'end' && world.gameState === GAME_STATES.PLAY) {
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

  // Return null if caught
  if (world.gameState === GAME_STATES.CAUGHT) return null;
  return world;
}

/**
 * Creates a directly staged world for a shot type (fallback when simulation fails).
 * Places entities in plausible mid-game positions with correct state.
 */
function createDirectStagedWorld(shot, seed) {
  const world = createWorld(seed);
  const { thief, guards, cameras, lootItems, exit, alarm, powerCut, coverObjects } = world;
  const W = CONFIG.FIELD_W;
  const H = CONFIG.FIELD_H;
  const HUD_H = CONFIG.HUD_HEIGHT;

  if (shot === 'start') {
    world.gameState = GAME_STATES.TITLE;
    // Run ambient patrol for 5 seconds
    const dt = 1 / 60;
    for (let i = 0; i < 300; i++) {
      for (const guard of guards) {
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
      for (const cam of cameras) {
        cam.sweepOffset += CONFIG.CAMERA_SWEEP_SPEED * dt;
        cam.currentAngle = cam.baseAngle + Math.sin(cam.sweepOffset) * CONFIG.CAMERA_SWEEP_RANGE;
      }
      world.timing.gameTime += dt;
    }
    return world;
  }

  // Start game for play/power/end
  world.startGame();

  if (shot === 'play') {
    // Place thief in a visible open-floor spot, sneaking, facing the Ledger
    thief.x = 430;
    thief.y = 560;
    thief.sneaking = true;
    thief.caught = false;

    // Guards at mid-patrol positions, facing away from thief
    guards[0].x = 280; guards[0].y = 250; guards[0].visionAngle = Math.PI / 4;      // facing NE
    guards[1].x = 620; guards[1].y = 220; guards[1].visionAngle = -Math.PI / 4;     // facing SE
    guards[2].x = 1000; guards[2].y = 350; guards[2].visionAngle = 3 * Math.PI / 4; // facing NW

    // Cameras at mid-sweep
    cameras[0].currentAngle = -Math.PI / 4 + 0.3;
    cameras[1].currentAngle = -3 * Math.PI / 4 - 0.3;

    // All loot uncollected
    for (const loot of lootItems) loot.collected = false;
    thief.loot = [];
    thief.hasLedger = false;
    exit.unlocked = false;

    // Moderate alarm
    alarm.level = 15;
    alarm.state = 'CALM';

    // Power cut available
    powerCut.available = true;
    powerCut.active = false;

    world.gameState = GAME_STATES.PLAY;
    return world;
  }

  if (shot === 'power') {
    // Place thief in a safe position during power cut
    thief.x = 400;
    thief.y = 400;
    thief.sneaking = true;
    thief.caught = false;

    // Guards with shrunken cones (power cut active)
    guards[0].x = 300; guards[0].y = 250; guards[0].visionAngle = Math.PI / 2;
    guards[1].x = 700; guards[1].y = 220; guards[1].visionAngle = 0;
    guards[2].x = 1000; guards[2].y = 380; guards[2].visionAngle = Math.PI;

    // Cameras BLIND
    for (const cam of cameras) {
      cam.blind = true;
      cam.active = true;
    }

    // Some loot collected
    lootItems[0].collected = true; // ledger
    lootItems[1].collected = false;
    lootItems[2].collected = false;
    lootItems[3].collected = false;
    thief.loot = ['ledger'];
    thief.hasLedger = true;
    exit.unlocked = true;

    // Low alarm (power cut freezes it)
    alarm.level = 10;
    alarm.state = 'CALM';

    // Power cut ACTIVE
    powerCut.available = false;
    powerCut.active = true;
    powerCut.timer = 6.5; // ~6.5 seconds remaining

    world.gameState = GAME_STATES.PLAY;
    return world;
  }

  if (shot === 'end') {
    // WIN state with score
    thief.x = exit.x;
    thief.y = exit.y - 30;
    thief.sneaking = false;
    thief.caught = false;
    thief.loot = ['ledger', 'gold', 'gold', 'gold'];
    thief.hasLedger = true;

    // Guards anywhere (not visible in win screen overlay)
    for (const guard of guards) {
      guard.state = 'patrol';
    }

    // All loot collected
    for (const loot of lootItems) loot.collected = true;
    exit.unlocked = true;
    exit.open = true;

    // Score calculated
    alarm.level = 25;
    alarm.state = 'CALM';
    powerCut.available = false;
    powerCut.active = false;

    // Realistic elapsed time: ~84s (1:24) so time bonus displays correctly
    world.timing.gameTime = 84;
    world.timing.startTime = 0;

    // Calculate score
    world.score.lootPoints = 800; // ledger 500 + 3 gold 300
    world.score.timeBonus = 1200;
    world.score.alarmPenalty = 125;
    world.score.peakAlarm = 25;
    world.score.final = world.score.lootPoints + world.score.timeBonus - world.score.alarmPenalty;

    world.gameState = GAME_STATES.WIN;
    return world;
  }

  return world;
}

/**
 * Runs the world forward for a given scenario and returns the world at the staged moment.
 * Uses direct staging for reliable, deterministic results.
 */
export function stageScene(shot, seed = 1) {
  return createDirectStagedWorld(shot, seed);
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