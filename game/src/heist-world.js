// Heist world simulation: thief, guards, cameras, loot, alarm, power cut, scoring.

import { CONFIG } from './config.js';
import { SeededRNG } from './random.js';

export const GAME_STATES = {
  TITLE: 'title',
  PLAY: 'play',
  PAUSED: 'paused',
  WIN: 'win',
  CAUGHT: 'caught',
};

export const ALARM_STATES = {
  CALM: 'CALM',
  SUSPICIOUS: 'SUSPICIOUS',
  ALARM: 'ALARM',
  LOCKDOWN: 'LOCKDOWN',
};

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  ALERT: 'alert',
};

export function createWorld(seed = 1) {
  const rng = new SeededRNG(seed);

  // Room layout constants
  const W = CONFIG.FIELD_W;
  const H = CONFIG.FIELD_H;
  const HUD_H = CONFIG.HUD_HEIGHT;

  // Thief (Wren)
  const thief = {
    x: 180,
    y: H - 100,
    radius: CONFIG.THIEF_RADIUS,
    speed: CONFIG.THIEF_SPEED,
    sneaking: false,
    coins: CONFIG.COIN_COUNT,
    loot: [],           // carried loot items: 'ledger' or 'gold'
    hasLedger: false,
    caught: false,
  };

  // Guard patrol waypoints (3 guards, each with 4-5 waypoints)
  const guardPaths = [
    // Guard 1: left side patrol
    [{ x: 200, y: 200 }, { x: 350, y: 200 }, { x: 350, y: 350 }, { x: 200, y: 350 }],
    // Guard 2: top patrol
    [{ x: 500, y: 180 }, { x: 750, y: 180 }, { x: 750, y: 320 }, { x: 500, y: 320 }],
    // Guard 3: right side patrol
    [{ x: 900, y: 220 }, { x: 1080, y: 220 }, { x: 1080, y: 400 }, { x: 900, y: 400 }],
  ];

  const guards = guardPaths.map((path, i) => ({
    x: path[0].x,
    y: path[0].y,
    radius: 18,
    speed: CONFIG.GUARD_SPEED,
    path,
    waypointIndex: 0,
    state: GUARD_STATES.PATROL,
    visionAngle: 0,          // current facing angle
    targetAngle: 0,          // angle toward target
    suspicionTimer: 0,       // time left in suspicious state
    lastSeenX: null,         // last known thief position
    lastSeenY: null,
    speechBubble: null,      // { text, timer }
    coneColor: CONFIG.COLORS.GUARD_CONE,
  }));

  // Cameras (2 wall-mounted sweeping cameras)
  const cameras = [
    { x: 150, y: 150, baseAngle: -Math.PI / 4, sweepOffset: 0, active: true, blind: false },
    { x: 1130, y: 150, baseAngle: -3 * Math.PI / 4, sweepOffset: 0, active: true, blind: false },
  ];

  // Loot items
  const lootItems = [
    { id: 'ledger', type: 'ledger', x: W / 2, y: 280, radius: 20, collected: false, points: CONFIG.LOOT_LEDGER_POINTS, glowPhase: 0 },
    { id: 'gold1', type: 'gold', x: 400, y: 480, radius: 16, collected: false, points: CONFIG.LOOT_GOLD_BAR_POINTS, glowPhase: 0 },
    { id: 'gold2', type: 'gold', x: 640, y: 480, radius: 16, collected: false, points: CONFIG.LOOT_GOLD_BAR_POINTS, glowPhase: 0 },
    { id: 'gold3', type: 'gold', x: 880, y: 480, radius: 16, collected: false, points: CONFIG.LOOT_GOLD_BAR_POINTS, glowPhase: 0 },
  ];

  // Exit door (bottom-right)
  const exit = {
    x: W - 80,
    y: H - 80,
    w: 100,
    h: 60,
    unlocked: false,
    open: false,
  };

  // Coins thrown by thief
  const coins = [];

  // Alarm system
  const alarm = {
    level: 0,
    max: CONFIG.ALARM_MAX,
    state: ALARM_STATES.CALM,
    lockdownTimer: 0,
    lockdownActive: false,
  };

  // Power cut
  const powerCut = {
    available: true,
    active: false,
    timer: 0,
    duration: CONFIG.POWER_CUT_DURATION,
  };

  // Game timing
  const timing = {
    gameTime: 0,
    startTime: 0,
    pausedTime: 0,
  };

  // Score
  const score = {
    lootPoints: 0,
    timeBonus: 0,
    alarmPenalty: 0,
    peakAlarm: 0,
    final: 0,
  };

  // Cover objects (block line of sight)
  const coverObjects = [
    // Crates
    { x: 300, y: 300, w: 60, h: 60, type: 'crate' },
    { x: 600, y: 250, w: 50, h: 50, type: 'crate' },
    { x: 950, y: 320, w: 60, h: 60, type: 'crate' },
    // Pillars
    { x: 250, y: 450, r: 30, type: 'pillar' },
    { x: 700, y: 450, r: 30, type: 'pillar' },
    { x: 1050, y: 450, r: 25, type: 'pillar' },
    // Plants
    { x: 180, y: 550, r: 35, type: 'plant' },
    { x: 1100, y: 550, r: 35, type: 'plant' },
  ];

  // Lamps (warm light pools)
  const lamps = [
    { x: 250, y: 200, radius: 120 },
    { x: 640, y: 180, radius: 140 },
    { x: 1030, y: 200, radius: 120 },
    { x: 400, y: 500, radius: 100 },
    { x: 880, y: 500, radius: 100 },
  ];

  // Velvet ropes around pedestal
  const velvetRopes = [
    { x: W / 2 - 60, y: 220, x2: W / 2 + 60, y2: 220 },
    { x: W / 2 - 60, y: 340, x2: W / 2 + 60, y2: 340 },
    { x: W / 2 - 60, y: 220, x2: W / 2 - 60, y2: 340 },
    { x: W / 2 + 60, y: 220, x2: W / 2 + 60, y2: 340 },
  ];

  return {
    // Core entities
    thief,
    guards,
    cameras,
    lootItems,
    exit,
    coins,
    coverObjects,
    lamps,
    velvetRopes,

    // Systems
    alarm,
    powerCut,
    timing,
    score,

    // State
    gameState: GAME_STATES.TITLE,
    rng,

    // Constants (for render access)
    W,
    H,
    HUD_H,

    // Helpers
    reset() {
      // Re-initialize everything
      const fresh = createWorld(seed);
      Object.assign(this, fresh);
    },

    startGame() {
      this.gameState = GAME_STATES.PLAY;
      this.timing.startTime = this.timing.gameTime;
    },

    pause() {
      if (this.gameState === GAME_STATES.PLAY) this.gameState = GAME_STATES.PAUSED;
    },

    resume() {
      if (this.gameState === GAME_STATES.PAUSED) this.gameState = GAME_STATES.PLAY;
    },
  };
}

/** Checks if a line segment intersects a rectangle. */
function lineRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh) {
  // Check if either endpoint is inside
  if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
  if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;
  // Check intersection with each edge
  if (lineLineIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry)) return true;     // top
  if (lineLineIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)) return true; // right
  if (lineLineIntersect(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh)) return true; // bottom
  if (lineLineIntersect(x1, y1, x2, y2, rx, ry + rh, rx, ry)) return true;     // left
  return false;
}

/** Checks if two line segments intersect. */
function lineLineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Checks if line segment intersects a circle. */
function lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

/** Checks if a point is inside a rectangle. */
function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/** Checks if a point is inside a circle. */
function pointInCircle(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Checks line of sight from (x1,y1) to (x2,y2) blocked by cover. */
export function checkLineOfSight(x1, y1, x2, y2, coverObjects) {
  for (const obj of coverObjects) {
    if (obj.type === 'crate') {
      if (lineRectIntersect(x1, y1, x2, y2, obj.x, obj.y, obj.w, obj.h)) return false;
    } else if (obj.type === 'pillar' || obj.type === 'plant') {
      if (lineCircleIntersect(x1, y1, x2, y2, obj.x, obj.y, obj.r)) return false;
    }
  }
  return true;
}

/** Updates the world by dt seconds. */
export function updateWorld(world, dt, input) {
  if (world.gameState !== GAME_STATES.PLAY) return;

  const { thief, guards, cameras, lootItems, exit, coins, alarm, powerCut, timing, score, coverObjects, W, H, HUD_H } = world;

  timing.gameTime += dt;

  // --- Power cut update ---
  if (powerCut.active) {
    powerCut.timer -= dt;
    if (powerCut.timer <= 0) {
      powerCut.active = false;
      powerCut.timer = 0;
      // Cameras reactivate
      for (const cam of cameras) cam.blind = false;
    }
  }

  // --- Lockdown update ---
  if (alarm.lockdownActive) {
    alarm.lockdownTimer -= dt;
    alarm.level = CONFIG.ALARM_MAX;
    if (alarm.lockdownTimer <= 0) {
      alarm.lockdownActive = false;
      alarm.lockdownTimer = 0;
      alarm.level = CONFIG.LOCKDOWN_ALARM_DROP;
    }
  }

  // --- Thief movement ---
  if (!thief.caught) {
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
    }

    const speedMult = thief.sneaking ? CONFIG.THIEF_SNEAK_MULT : 1;
    const lootSlow = 1 - thief.loot.length * CONFIG.LOOT_SLOW_PER_ITEM;
    const moveSpeed = thief.speed * speedMult * lootSlow;

    const newX = thief.x + dx * moveSpeed * dt;
    const newY = thief.y + dy * moveSpeed * dt;

    // Clamp to play area (below HUD)
    thief.x = Math.max(thief.radius, Math.min(W - thief.radius, newX));
    thief.y = Math.max(HUD_H + thief.radius, Math.min(H - thief.radius, newY));
  }

  // --- Coin throws ---
  if (input.throwCoin && thief.coins > 0 && coins.length < 3) {
    const angle = Math.atan2(input.mouseY - thief.y, input.mouseX - thief.x);
    const range = Math.min(CONFIG.COIN_THROW_RANGE, Math.hypot(input.mouseX - thief.x, input.mouseY - thief.y));
    coins.push({
      x: thief.x + Math.cos(angle) * 30,
      y: thief.y + Math.sin(angle) * 30,
      targetX: thief.x + Math.cos(angle) * range,
      targetY: thief.y + Math.sin(angle) * range,
      timer: 0.3, // coin lands after 0.3s
      landed: false,
    });
    thief.coins--;
    // Play coin sound
    if (world.audio) world.audio.playCoin();
  }

  // Update coins
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.timer -= dt;
    if (!coin.landed && coin.timer <= 0) {
      coin.landed = true;
      coin.timer = 3; // guards investigate for 3 seconds
      // Notify guards
      for (const guard of guards) {
        if (guard.state === GUARD_STATES.PATROL) {
          const dist = Math.hypot(guard.x - coin.targetX, guard.y - coin.targetY);
          if (dist < 400) { // hearing range
            guard.state = GUARD_STATES.SUSPICIOUS;
            guard.lastSeenX = coin.targetX;
            guard.lastSeenY = coin.targetY;
            guard.suspicionTimer = CONFIG.GUARD_SUSPICION_TIME;
            guard.speechBubble = { text: 'What was that?', timer: 2 };
          }
        }
      }
    }
    if (coin.landed) {
      coin.timer -= dt;
      if (coin.timer <= 0) coins.splice(i, 1);
    }
  }

  // --- Guard updates ---
  for (const guard of guards) {
    // Speech bubble timer
    if (guard.speechBubble) {
      guard.speechBubble.timer -= dt;
      if (guard.speechBubble.timer <= 0) guard.speechBubble = null;
    }

    if (guard.state === GUARD_STATES.PATROL) {
      // Patrol along waypoints
      const target = guard.path[guard.waypointIndex];
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 5) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.path.length;
        guard.visionAngle = Math.atan2(dy, dx);
      } else {
        guard.x += (dx / dist) * guard.speed * dt;
        guard.y += (dy / dist) * guard.speed * dt;
        guard.visionAngle = Math.atan2(dy, dx);
      }

      // Check vision for thief
      if (!powerCut.active) checkGuardVision(guard, thief, coverObjects, world);

    } else if (guard.state === GUARD_STATES.SUSPICIOUS) {
      // Move to last seen position
      if (guard.lastSeenX !== null && guard.lastSeenY !== null) {
        const dx = guard.lastSeenX - guard.x;
        const dy = guard.lastSeenY - guard.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 10) {
          // Arrived, look around
          guard.suspicionTimer -= dt;
          guard.visionAngle += 2 * dt; // scan
          if (guard.suspicionTimer <= 0) {
            guard.state = GUARD_STATES.PATROL;
            guard.lastSeenX = null;
            guard.lastSeenY = null;
          }
        } else {
          guard.x += (dx / dist) * guard.speed * dt;
          guard.y += (dy / dist) * guard.speed * dt;
          guard.visionAngle = Math.atan2(dy, dx);
        }
      }

      // Still check vision while suspicious
      if (!powerCut.active) checkGuardVision(guard, thief, coverObjects, world);

    } else if (guard.state === GUARD_STATES.ALERT) {
      // Chase thief directly
      const dx = thief.x - guard.x;
      const dy = thief.y - guard.y;
      const dist = Math.hypot(dx, dy);

      guard.x += (dx / dist) * guard.speed * 1.3 * dt; // faster when alert
      guard.y += (dy / dist) * guard.speed * 1.3 * dt;
      guard.visionAngle = Math.atan2(dy, dx);

      // Check catch
      if (dist < guard.radius + thief.radius) {
        thief.caught = true;
        world.gameState = GAME_STATES.CAUGHT;
        if (world.audio) world.audio.playCaught();
      }

      // If lost sight for a while, go back to suspicious
      const los = checkLineOfSight(guard.x, guard.y, thief.x, thief.y, coverObjects);
      const inCone = isInVisionCone(guard.x, guard.y, guard.visionAngle, CONFIG.GUARD_VISION_ANGLE * (powerCut.active ? CONFIG.POWER_CUT_CONE_MULT : 1), CONFIG.GUARD_VISION_RANGE, thief.x, thief.y);
      if (!los || !inCone) {
        guard.state = GUARD_STATES.SUSPICIOUS;
        guard.lastSeenX = thief.x;
        guard.lastSeenY = thief.y;
        guard.suspicionTimer = 3;
      }
    }
  }

  // --- Camera updates ---
  for (const cam of cameras) {
    if (!cam.active || cam.blind) continue;

    // Sweep
    cam.sweepOffset += CONFIG.CAMERA_SWEEP_SPEED * dt;
    const sweep = Math.sin(cam.sweepOffset) * CONFIG.CAMERA_SWEEP_RANGE;
    cam.currentAngle = cam.baseAngle + sweep;

    // Check vision
    if (isInVisionCone(cam.x, cam.y, cam.currentAngle, CONFIG.CAMERA_VISION_ANGLE, CONFIG.CAMERA_VISION_RANGE, thief.x, thief.y)) {
      if (checkLineOfSight(cam.x, cam.y, thief.x, thief.y, coverObjects)) {
        raiseAlarm(world, CONFIG.CAMERA_DETECTION_RATE * dt);
      }
    }
  }

  // --- Loot collection ---
  if (input.interact) {
    for (const loot of lootItems) {
      if (!loot.collected) {
        const dist = Math.hypot(thief.x - loot.x, thief.y - loot.y);
        if (dist < thief.radius + loot.radius + 5) {
          loot.collected = true;
          thief.loot.push(loot.type);
          if (loot.type === 'ledger') {
            thief.hasLedger = true;
            exit.unlocked = true;
            score.lootPoints += loot.points;
          } else {
            score.lootPoints += loot.points;
          }
          if (world.audio) world.audio.playLoot();
        }
      }
    }

    // Exit interaction
    if (thief.hasLedger && exit.unlocked) {
      const dist = Math.hypot(thief.x - exit.x, thief.y - exit.y);
      if (dist < thief.radius + 40) {
        exit.open = true;
        world.gameState = GAME_STATES.WIN;
        calculateFinalScore(world);
        if (world.audio) world.audio.playWin();
      }
    }
  }

  // --- Alarm decay / update ---
  if (!alarm.lockdownActive) {
    const wasSeen = checkAnyVision(world);
    if (wasSeen) {
      // Alarm already raised in vision checks
    } else {
      alarm.level = Math.max(0, alarm.level - CONFIG.ALARM_DECAY * dt);
    }
  }

  // Update alarm state
  if (alarm.level >= CONFIG.ALARM_MAX && !alarm.lockdownActive) {
    alarm.lockdownActive = true;
    alarm.lockdownTimer = CONFIG.LOCKDOWN_DURATION;
    alarm.state = ALARM_STATES.LOCKDOWN;
    // All guards go alert and converge
    for (const guard of guards) {
      guard.state = GUARD_STATES.ALERT;
      guard.lastSeenX = thief.x;
      guard.lastSeenY = thief.y;
    }
    if (world.audio) world.audio.playLockdown();
  } else if (alarm.level >= CONFIG.ALARM_ALARM) {
    alarm.state = ALARM_STATES.ALARM;
  } else if (alarm.level >= CONFIG.ALARM_SUSPICIOUS) {
    alarm.state = ALARM_STATES.SUSPICIOUS;
  } else {
    alarm.state = ALARM_STATES.CALM;
  }

  score.peakAlarm = Math.max(score.peakAlarm, alarm.level);

  // --- Power cut activation ---
  if (input.powerCut && powerCut.available && !powerCut.active) {
    powerCut.active = true;
    powerCut.available = false;
    powerCut.timer = powerCut.duration;
    for (const cam of cameras) cam.blind = true;
    alarm.level = Math.min(alarm.level, CONFIG.ALARM_SUSPICIOUS - 1); // freeze/decay during power cut
    if (world.audio) world.audio.playPowerCut();
  }

  // --- Loot glow animation ---
  for (const loot of lootItems) {
    loot.glowPhase += dt * 3;
  }
}

/** Checks if a point is within a vision cone. */
export function isInVisionCone(ox, oy, angle, fov, range, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  const targetAngle = Math.atan2(dy, dx);
  let diff = Math.abs(targetAngle - angle);
  while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
  return diff <= fov / 2;
}

/** Checks guard vision against thief. */
function checkGuardVision(guard, thief, coverObjects, world) {
  const coneMult = world.powerCut.active ? CONFIG.POWER_CUT_CONE_MULT : 1;
  const fov = CONFIG.GUARD_VISION_ANGLE * coneMult;
  const range = CONFIG.GUARD_VISION_RANGE * coneMult;

  if (isInVisionCone(guard.x, guard.y, guard.visionAngle, fov, range, thief.x, thief.y)) {
    if (checkLineOfSight(guard.x, guard.y, thief.x, thief.y, coverObjects)) {
      // Seen!
      const detectionRate = CONFIG.GUARD_DETECTION_RATE * (thief.sneaking ? CONFIG.GUARD_SNEAK_DETECTION_MULT : 1);
      raiseAlarm(world, detectionRate * (1/60)); // dt approx

      if (guard.state === GUARD_STATES.PATROL || guard.state === GUARD_STATES.SUSPICIOUS) {
        guard.state = GUARD_STATES.ALERT;
        guard.speechBubble = { text: 'Hey! Stop!', timer: 1.5 };
        if (world.audio) world.audio.playSpot();
      }
      guard.lastSeenX = thief.x;
      guard.lastSeenY = thief.y;
    }
  }
}

/** Checks if thief is seen by any guard or camera. */
function checkAnyVision(world) {
  const { thief, guards, cameras, powerCut, coverObjects } = world;

  for (const guard of guards) {
    const coneMult = powerCut.active ? CONFIG.POWER_CUT_CONE_MULT : 1;
    const fov = CONFIG.GUARD_VISION_ANGLE * coneMult;
    const range = CONFIG.GUARD_VISION_RANGE * coneMult;
    if (isInVisionCone(guard.x, guard.y, guard.visionAngle, fov, range, thief.x, thief.y)) {
      if (checkLineOfSight(guard.x, guard.y, thief.x, thief.y, coverObjects)) return true;
    }
  }

  for (const cam of cameras) {
    if (!cam.active || cam.blind) continue;
    if (isInVisionCone(cam.x, cam.y, cam.currentAngle, CONFIG.CAMERA_VISION_ANGLE, CONFIG.CAMERA_VISION_RANGE, thief.x, thief.y)) {
      if (checkLineOfSight(cam.x, cam.y, thief.x, thief.y, coverObjects)) return true;
    }
  }

  return false;
}

/** Raises alarm level. */
function raiseAlarm(world, amount) {
  world.alarm.level = Math.min(CONFIG.ALARM_MAX, world.alarm.level + amount);
}

/** Calculates final score on win. */
function calculateFinalScore(world) {
  const { score, timing } = world;
  const playTime = timing.gameTime - timing.startTime;
  score.timeBonus = Math.max(0, Math.floor(5000 / (playTime + 1)));
  score.alarmPenalty = Math.floor(score.peakAlarm * 5);
  score.final = score.lootPoints + score.timeBonus - score.alarmPenalty;
}