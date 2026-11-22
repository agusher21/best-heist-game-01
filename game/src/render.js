// All Canvas 2D rendering: room, entities, HUD, legend, screens.

import { CONFIG } from './config.js';
import { GAME_STATES, ALARM_STATES, GUARD_STATES } from './heist-world.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const { COLORS, FONT_LARGE, FONT_MEDIUM, FONT_SMALL, FONT_TINY, HUD_HEIGHT, LEGEND_W, LEGEND_H } = CONFIG;

  // Pre-render static patterns for performance
  const floorPattern = createFloorPattern(ctx);
  const vaultDoorPattern = createVaultDoorPattern(ctx);

  function createFloorPattern(ctx) {
    const size = 64;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    octx.fillStyle = COLORS.FLOOR;
    octx.fillRect(0, 0, size, size);
    // Subtle marble veins
    octx.strokeStyle = '#1a2238';
    octx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      octx.beginPath();
      octx.moveTo(Math.random() * size, 0);
      octx.lineTo(Math.random() * size, size);
      octx.stroke();
    }
    return ctx.createPattern(off, 'repeat');
  }

  function createVaultDoorPattern(ctx) {
    const size = 128;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    octx.fillStyle = COLORS.VAULT_DOOR;
    octx.fillRect(0, 0, size, size);
    // Rivets
    octx.fillStyle = '#1a1f2e';
    for (let x = 16; x < size; x += 32) {
      for (let y = 16; y < size; y += 32) {
        octx.beginPath();
        octx.arc(x, y, 3, 0, Math.PI * 2);
        octx.fill();
      }
    }
    return ctx.createPattern(off, 'repeat');
  }

  function clear() {
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawFloor() {
    ctx.fillStyle = floorPattern;
    ctx.fillRect(0, HUD_HEIGHT, canvas.width, canvas.height - HUD_HEIGHT);
  }

  function drawVaultDoorBackdrop() {
    // Large vault door on the back wall (top)
    ctx.fillStyle = vaultDoorPattern;
    ctx.fillRect(200, HUD_HEIGHT, 880, 180);
    // Door frame
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 4;
    ctx.strokeRect(200, HUD_HEIGHT, 880, 180);
    // Heavy bolts
    ctx.fillStyle = '#2a2f3e';
    for (let x = 240; x < 1040; x += 160) {
      ctx.beginPath();
      ctx.arc(x, HUD_HEIGHT + 40, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, HUD_HEIGHT + 140, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVelvetRopes(ropes) {
    ctx.strokeStyle = COLORS.VELVET_ROPE;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const rope of ropes) {
      ctx.beginPath();
      ctx.moveTo(rope.x, rope.y);
      ctx.lineTo(rope.x2, rope.y2);
      ctx.stroke();
      // Tassels
      ctx.fillStyle = '#4a2c2a';
      const steps = Math.max(1, Math.floor(Math.hypot(rope.x2 - rope.x, rope.y2 - rope.y) / 30));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const tx = rope.x + (rope.x2 - rope.x) * t;
        const ty = rope.y + (rope.y2 - rope.y) * t;
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPedestal() {
    const cx = CONFIG.FIELD_W / 2;
    const cy = 280;
    // Base
    ctx.fillStyle = COLORS.PEDESTAL;
    ctx.fillRect(cx - 70, cy - 10, 140, 80);
    // Top
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(cx - 60, cy - 20, 120, 15);
    // Gold trim
    ctx.strokeStyle = COLORS.LOOT_GLOW;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 60, cy - 20, 120, 15);
  }

  function drawDisplayCases() {
    const cases = [
      { x: 400, y: 480 },
      { x: 640, y: 480 },
      { x: 880, y: 480 },
    ];
    for (const c of cases) {
      // Case base
      ctx.fillStyle = '#2a2f3e';
      ctx.fillRect(c.x - 40, c.y - 10, 80, 40);
      // Glass top
      ctx.fillStyle = 'rgba(180, 200, 220, 0.15)';
      ctx.fillRect(c.x - 38, c.y - 35, 76, 30);
      // Glass frame
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - 38, c.y - 35, 76, 30);
    }
  }

  function drawCoverObjects(objects) {
    for (const obj of objects) {
      if (obj.type === 'crate') {
        ctx.fillStyle = COLORS.CRATE;
        ctx.fillRect(obj.x - obj.w / 2, obj.y - obj.h / 2, obj.w, obj.h);
        // Crate details
        ctx.strokeStyle = '#2e1d1a';
        ctx.lineWidth = 2;
        ctx.strokeRect(obj.x - obj.w / 2, obj.y - obj.h / 2, obj.w, obj.h);
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y - obj.h / 2);
        ctx.lineTo(obj.x, obj.y + obj.h / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(obj.x - obj.w / 2, obj.y);
        ctx.lineTo(obj.x + obj.w / 2, obj.y);
        ctx.stroke();
      } else if (obj.type === 'pillar') {
        // Pillar with 3D effect
        const grad = ctx.createRadialGradient(obj.x - 5, obj.y - 5, 0, obj.x, obj.y, obj.r);
        grad.addColorStop(0, '#607d8b');
        grad.addColorStop(1, '#263238');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obj.x - 3, obj.y - 3, obj.r - 3, -Math.PI / 2, Math.PI / 4);
        ctx.stroke();
      } else if (obj.type === 'plant') {
        // Pot
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(obj.x - 20, obj.y + 10, 40, 25);
        // Leaves
        ctx.fillStyle = COLORS.PLANT;
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const lx = obj.x + Math.cos(angle) * 25;
          const ly = obj.y + Math.sin(angle) * 15;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 20, 10, angle, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawLamps(lamps, powerCutActive) {
    for (const lamp of lamps) {
      // Lamp fixture on wall (top)
      if (lamp.y < 250) {
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.arc(lamp.x, HUD_HEIGHT + 10, 12, 0, Math.PI * 2);
        ctx.fill();
        // Arm
        ctx.strokeStyle = '#455a64';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(lamp.x, HUD_HEIGHT + 10);
        ctx.lineTo(lamp.x, HUD_HEIGHT + 30);
        ctx.stroke();
        // Shade
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.moveTo(lamp.x - 18, HUD_HEIGHT + 30);
        ctx.lineTo(lamp.x + 18, HUD_HEIGHT + 30);
        ctx.lineTo(lamp.x + 12, HUD_HEIGHT + 50);
        ctx.lineTo(lamp.x - 12, HUD_HEIGHT + 50);
        ctx.closePath();
        ctx.fill();
      }

      // Light pool (only if power not cut)
      if (!powerCutActive) {
        const grad = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.radius);
        grad.addColorStop(0, hexToRgba(COLORS.LAMP_POOL, COLORS.LAMP_POOL_ALPHA * 0.8));
        grad.addColorStop(0.5, hexToRgba(COLORS.LAMP_POOL, COLORS.LAMP_POOL_ALPHA * 0.4));
        grad.addColorStop(1, hexToRgba(COLORS.LAMP_POOL, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, lamp.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawThief(thief) {
    ctx.save();
    ctx.translate(thief.x, thief.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, thief.radius * 0.8, thief.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyColor = thief.sneaking ? COLORS.THIEF_SNEAK : COLORS.THIEF;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, thief.radius, thief.radius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hood
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(0, -thief.radius * 0.5, thief.radius * 0.9, Math.PI, 0);
    ctx.lineTo(thief.radius * 0.9, -thief.radius * 0.5);
    ctx.lineTo(-thief.radius * 0.9, -thief.radius * 0.5);
    ctx.closePath();
    ctx.fill();

    // Eyes (glint)
    ctx.fillStyle = COLORS.TEXT;
    ctx.beginPath();
    ctx.arc(-4, -thief.radius * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -thief.radius * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Loot bag indicator
    if (thief.loot.length > 0) {
      ctx.fillStyle = COLORS.LOOT_GLOW;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(thief.loot.length.toString(), 0, thief.radius + 18);
    }

    ctx.restore();
  }

  function drawGuard(guard) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.rotate(guard.visionAngle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, guard.radius * 0.7, guard.radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = COLORS.GUARD_BODY;
    ctx.beginPath();
    ctx.ellipse(0, 0, guard.radius, guard.radius * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = COLORS.GUARD_HEAD;
    ctx.beginPath();
    ctx.arc(0, -guard.radius * 0.4, guard.radius * 0.85, Math.PI, 0);
    ctx.lineTo(guard.radius * 0.85, -guard.radius * 0.4);
    ctx.lineTo(-guard.radius * 0.85, -guard.radius * 0.4);
    ctx.closePath();
    ctx.fill();

    // Visor
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(0, -guard.radius * 0.4, guard.radius * 0.6, Math.PI, 0);
    ctx.lineTo(guard.radius * 0.6, -guard.radius * 0.4);
    ctx.lineTo(-guard.radius * 0.6, -guard.radius * 0.4);
    ctx.closePath();
    ctx.fill();

    // State indicator
    if (guard.state === GUARD_STATES.SUSPICIOUS) {
      ctx.fillStyle = COLORS.GUARD_CONE_SUSPICIOUS;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', 0, -guard.radius - 10);
    } else if (guard.state === GUARD_STATES.ALERT) {
      ctx.fillStyle = COLORS.GUARD_CONE_ALERT;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -guard.radius - 10);
    }

    // Speech bubble
    if (guard.speechBubble) {
      const text = guard.speechBubble.text;
      ctx.font = FONT_TINY;
      const tw = ctx.measureText(text).width;
      const bw = tw + 16;
      const bh = 22;
      const bx = -bw / 2;
      const by = -guard.radius - 40;

      ctx.fillStyle = COLORS.SPEECH_BG;
      ctx.strokeStyle = COLORS.SPEECH_BORDER;
      ctx.lineWidth = 2;
      roundRect(ctx, bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COLORS.SPEECH_TEXT;
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, by + 16);
    }

    ctx.restore();
  }

  function drawGuardCone(guard, powerCutActive) {
    const coneMult = powerCutActive ? CONFIG.POWER_CUT_CONE_MULT : 1;
    const fov = CONFIG.GUARD_VISION_ANGLE * coneMult;
    const range = CONFIG.GUARD_VISION_RANGE * coneMult;

    let coneColor, alpha;
    if (guard.state === GUARD_STATES.ALERT) {
      coneColor = COLORS.GUARD_CONE_ALERT;
      alpha = 0.3;
    } else if (guard.state === GUARD_STATES.SUSPICIOUS) {
      coneColor = COLORS.GUARD_CONE_SUSPICIOUS;
      alpha = 0.25;
    } else {
      coneColor = COLORS.GUARD_CONE;
      alpha = COLORS.GUARD_CONE_ALPHA;
    }

    ctx.fillStyle = hexToRgba(coneColor, alpha);
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, range, guard.visionAngle - fov / 2, guard.visionAngle + fov / 2);
    ctx.closePath();
    ctx.fill();

    // Cone outline
    ctx.strokeStyle = hexToRgba(coneColor, alpha * 2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, range, guard.visionAngle - fov / 2, guard.visionAngle + fov / 2);
    ctx.closePath();
    ctx.stroke();
  }

  function drawCamera(cam) {
    if (!cam.active) return;

    ctx.save();
    ctx.translate(cam.x, cam.y);

    // Mount
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Camera body
    ctx.fillStyle = cam.blind ? '#2a2a2a' : '#455a64';
    ctx.fillRect(-18, -10, 36, 20);

    // Lens
    ctx.fillStyle = cam.blind ? '#1a1a1a' : COLORS.CAMERA_CONE;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Lens glow when active
    if (!cam.blind) {
      ctx.shadowColor = COLORS.CAMERA_CONE;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Sweep indicator
    if (!cam.blind) {
      ctx.strokeStyle = COLORS.CAMERA_CONE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, cam.currentAngle - 0.2, cam.currentAngle + 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawCameraCone(cam) {
    if (!cam.active || cam.blind) return;

    ctx.fillStyle = hexToRgba(COLORS.CAMERA_CONE, COLORS.CAMERA_CONE_ALPHA);
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.arc(cam.x, cam.y, CONFIG.CAMERA_VISION_RANGE, cam.currentAngle - CONFIG.CAMERA_VISION_ANGLE / 2, cam.currentAngle + CONFIG.CAMERA_VISION_ANGLE / 2);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = hexToRgba(COLORS.CAMERA_CONE, COLORS.CAMERA_CONE_ALPHA * 2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.arc(cam.x, cam.y, CONFIG.CAMERA_VISION_RANGE, cam.currentAngle - CONFIG.CAMERA_VISION_ANGLE / 2, cam.currentAngle + CONFIG.CAMERA_VISION_ANGLE / 2);
    ctx.closePath();
    ctx.stroke();
  }

  function drawLoot(lootItems, time) {
    for (const loot of lootItems) {
      if (loot.collected) continue;

      const pulse = Math.sin(loot.glowPhase) * 0.3 + 0.7;
      const glowRadius = loot.radius + 8 * pulse;

      // Glow
      const grad = ctx.createRadialGradient(loot.x, loot.y, 0, loot.x, loot.y, glowRadius);
      grad.addColorStop(0, hexToRgba(COLORS.LOOT_GLOW, COLORS.LOOT_GLOW_ALPHA * pulse));
      grad.addColorStop(1, hexToRgba(COLORS.LOOT_GLOW, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(loot.x, loot.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Item
      if (loot.type === 'ledger') {
        // Golden book
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(loot.x - loot.radius, loot.y - loot.radius * 0.8, loot.radius * 2, loot.radius * 1.6);
        // Spine
        ctx.fillStyle = '#e6c200';
        ctx.fillRect(loot.x - 4, loot.y - loot.radius * 0.8, 8, loot.radius * 1.6);
        // Title
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.fillText('MERIDIAN', loot.x, loot.y - 2);
        ctx.fillText('LEDGER', loot.x, loot.y + 10);
      } else {
        // Gold bar
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(loot.x - loot.radius, loot.y - loot.radius * 0.6, loot.radius * 2, loot.radius * 1.2);
        // Shine
        ctx.fillStyle = '#fff8e1';
        ctx.fillRect(loot.x - loot.radius + 4, loot.y - loot.radius * 0.6 + 4, loot.radius - 4, 6);
        // Markings
        ctx.fillStyle = '#b8860b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('999.9', loot.x, loot.y + 3);
      }
    }
  }

  function drawExit(exit) {
    // Door frame
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(exit.x - exit.w / 2, exit.y - exit.h / 2, exit.w, exit.h);

    // Door
    const doorColor = exit.unlocked ? COLORS.EXIT_GREEN : '#455a64';
    ctx.fillStyle = doorColor;
    ctx.fillRect(exit.x - exit.w / 2 + 4, exit.y - exit.h / 2 + 4, exit.w - 8, exit.h - 8);

    // Glow when unlocked
    if (exit.unlocked) {
      const grad = ctx.createRadialGradient(exit.x, exit.y, 0, exit.x, exit.y, 60);
      grad.addColorStop(0, hexToRgba(COLORS.EXIT_GREEN, COLORS.EXIT_GREEN_ALPHA));
      grad.addColorStop(1, hexToRgba(COLORS.EXIT_GREEN, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(exit.x, exit.y, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    // EXIT text
    ctx.fillStyle = exit.unlocked ? '#002b15' : '#78909c';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', exit.x, exit.y + 5);
    if (exit.unlocked) {
      ctx.font = '11px sans-serif';
      ctx.fillText('OPEN', exit.x, exit.y + 20);
    }

    // Handle
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.arc(exit.x + exit.w / 2 - 14, exit.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCoins(coins) {
    for (const coin of coins) {
      if (!coin.landed) continue;
      ctx.fillStyle = COLORS.COIN;
      ctx.beginPath();
      ctx.arc(coin.targetX, coin.targetY, 8, 0, Math.PI * 2);
      ctx.fill();
      // $ sign
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', coin.targetX, coin.targetY + 3);
    }
  }

  function drawPowerCutBanner() {
    const text = 'POWER CUT';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    const tw = ctx.measureText(text).width;
    const padding = 40;
    const bw = tw + padding * 2;
    const bh = 70;
    const x = (CONFIG.FIELD_W - bw) / 2;
    const y = CONFIG.HUD_HEIGHT + 50;

    // Background
    const grad = ctx.createLinearGradient(x, y, x + bw, y);
    grad.addColorStop(0, 'rgba(255, 23, 68, 0.1)');
    grad.addColorStop(0.5, 'rgba(255, 23, 68, 0.3)');
    grad.addColorStop(1, 'rgba(255, 23, 68, 0.1)');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, bw, bh, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = COLORS.POWER_CUT_BANNER;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, bw, bh, 12);
    ctx.stroke();

    // Text with glow
    ctx.shadowColor = COLORS.POWER_CUT_BANNER;
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffcdd2';
    ctx.textAlign = 'center';
    ctx.fillText(text, CONFIG.FIELD_W / 2, y + bh / 2 + 16);
    ctx.shadowBlur = 0;

    // Timer
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ffebee';
    ctx.fillText(`${Math.ceil(powerCutTimer)}s`, CONFIG.FIELD_W / 2, y + bh + 30);
  }

  function drawHUD(world) {
    const { thief, alarm, timing, powerCut, score } = world;
    const playTime = timing.gameTime - timing.startTime;

    // HUD background
    ctx.fillStyle = COLORS.HUD_BG;
    ctx.fillRect(0, 0, CONFIG.FIELD_W, HUD_HEIGHT);
    ctx.strokeStyle = COLORS.HUD_BORDER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT);
    ctx.lineTo(CONFIG.FIELD_W, HUD_HEIGHT);
    ctx.stroke();

    // Title (left)
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = FONT_LARGE;
    ctx.textAlign = 'left';
    ctx.fillText('THE SILENT LEDGER', 20, 35);

    // Objective (center)
    ctx.font = FONT_MEDIUM;
    let objective = 'Infiltrate Meridian Bank — Steal the Ledger';
    if (thief.hasLedger) objective = 'Ledger secured — Reach the EXIT';
    else if (thief.loot.length > 0) objective = `Carrying ${thief.loot.length} item(s) — Find the Ledger`;
    const objW = ctx.measureText(objective).width;
    ctx.fillStyle = COLORS.TEXT_DIM;
    ctx.fillText(objective, (CONFIG.FIELD_W - objW) / 2, 35);

    // Loot / Score (center-right)
    ctx.font = FONT_SMALL;
    ctx.textAlign = 'right';
    const lootText = `Loot: ${thief.loot.length}  |  Score: ${score.lootPoints}`;
    ctx.fillStyle = COLORS.TEXT;
    ctx.fillText(lootText, CONFIG.FIELD_W - 20, 30);

    // Timer
    const minutes = Math.floor(playTime / 60);
    const seconds = Math.floor(playTime % 60);
    const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    ctx.fillStyle = COLORS.TEXT_DIM;
    ctx.fillText(timeText, CONFIG.FIELD_W - 20, 52);

    // Coins
    ctx.fillStyle = COLORS.COIN;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Coins: '.repeat(0) + '●'.repeat(thief.coins) + '○'.repeat(CONFIG.COIN_COUNT - thief.coins), 20, 60);

    // Weight indicator
    if (thief.loot.length > 0) {
      const slowPct = Math.round(thief.loot.length * 8);
      ctx.fillStyle = COLORS.TEXT_DIM;
      ctx.font = FONT_TINY;
      ctx.fillText(`Weight: -${slowPct}% speed`, 20, 78);
    }

    // Alarm meter (wide bar, bottom of HUD)
    const meterX = 220;
    const meterY = HUD_HEIGHT - 28;
    const meterW = CONFIG.FIELD_W - 440;
    const meterH = 18;

    // Background
    ctx.fillStyle = '#0a0e1a';
    roundRect(ctx, meterX, meterY, meterW, meterH, 9);
    ctx.fill();

    // Fill
    const fillW = (alarm.level / CONFIG.ALARM_MAX) * meterW;
    let alarmColor = COLORS.ALARM_CALM;
    if (alarm.state === ALARM_STATES.SUSPICIOUS) alarmColor = COLORS.ALARM_SUSPICIOUS;
    else if (alarm.state === ALARM_STATES.ALARM) alarmColor = COLORS.ALARM_ALARM;
    else if (alarm.state === ALARM_STATES.LOCKDOWN) alarmColor = COLORS.ALARM_LOCKDOWN;

    const fillGrad = ctx.createLinearGradient(meterX, meterY, meterX + fillW, meterY);
    fillGrad.addColorStop(0, alarmColor);
    fillGrad.addColorStop(1, shadeColor(alarmColor, -30));
    ctx.fillStyle = fillGrad;
    roundRect(ctx, meterX, meterY, fillW, meterH, 9);
    ctx.fill();

    // Border
    ctx.strokeStyle = COLORS.HUD_BORDER;
    ctx.lineWidth = 1.5;
    roundRect(ctx, meterX, meterY, meterW, meterH, 9);
    ctx.stroke();

    // Tick marks at thresholds
    for (const threshold of [CONFIG.ALARM_SUSPICIOUS, CONFIG.ALARM_ALARM, CONFIG.ALARM_MAX]) {
      const tx = meterX + (threshold / CONFIG.ALARM_MAX) * meterW;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, meterY);
      ctx.lineTo(tx, meterY + meterH);
      ctx.stroke();
    }

    // Alarm state label
    ctx.fillStyle = alarmColor;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(alarm.state, meterX + meterW + 10, meterY + 13);

    // Power cut indicator
    if (!powerCut.available) {
      ctx.fillStyle = powerCut.active ? COLORS.POWER_CUT_BANNER : COLORS.TEXT_DIM;
      ctx.font = FONT_TINY;
      ctx.textAlign = 'right';
      const pcText = powerCut.active ? `POWER CUT: ${Math.ceil(powerCut.timer)}s` : 'POWER CUT: USED';
      ctx.fillText(pcText, CONFIG.FIELD_W - 20, 78);
    } else {
      ctx.fillStyle = COLORS.TEXT_DIM;
      ctx.font = FONT_TINY;
      ctx.textAlign = 'right';
      ctx.fillText('Q: Power Cut (1x)', CONFIG.FIELD_W - 20, 78);
    }
  }

  function drawLegend() {
    const x = 10;
    const y = CONFIG.FIELD_H - LEGEND_H - 10;

    ctx.fillStyle = COLORS.HUD_BG;
    roundRect(ctx, x, y, LEGEND_W, LEGEND_H, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.HUD_BORDER;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, LEGEND_W, LEGEND_H, 8);
    ctx.stroke();

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = COLORS.TEXT;
    ctx.textAlign = 'left';
    ctx.fillText('LEGEND', x + 12, y + 22);

    const items = [
      { color: COLORS.THIEF, label: 'Wren (Thief)' },
      { color: COLORS.GUARD_BODY, label: 'Guard (Patrol)' },
      { color: COLORS.GUARD_CONE_SUSPICIOUS, label: 'Guard (Suspicious ?)' },
      { color: COLORS.GUARD_CONE_ALERT, label: 'Guard (Alert !)' },
      { color: COLORS.CAMERA_CONE, label: 'Camera Sweep' },
      { color: COLORS.LOOT_GLOW, label: 'Ledger / Gold Bars' },
      { color: COLORS.EXIT_GREEN, label: 'Exit (Green)' },
    ];

    let iy = y + 42;
    for (const item of items) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(x + 20, iy + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.TEXT_DIM;
      ctx.font = FONT_TINY;
      ctx.fillText(item.label, x + 36, iy + 11);
      iy += 20;
    }

    // Controls hint
    iy += 4;
    ctx.fillStyle = COLORS.TEXT_DIM;
    ctx.font = '11px sans-serif';
    ctx.fillText('WASD/Arrows: Move  |  Shift: Sneak  |  Click: Throw Coin', x + 12, iy);
    iy += 16;
    ctx.fillText('E: Interact  |  Q: Cut Power (1x)  |  P/Esc: Pause', x + 12, iy);
  }

  function drawScreenTitle(world) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(13, 18, 32, 0.95)';
    ctx.fillRect(0, 0, CONFIG.FIELD_W, CONFIG.FIELD_H);

    // Title
    ctx.fillStyle = COLORS.LOOT_GLOW;
    ctx.font = 'bold 64px "Segoe UI", "Noto Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.LOOT_GLOW;
    ctx.shadowBlur = 20;
    ctx.fillText('THE SILENT LEDGER', CONFIG.FIELD_W / 2, 200);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText('A Meridian Bank Heist  •  02:00 Hours', CONFIG.FIELD_W / 2, 250);

    // Flavor
    ctx.fillStyle = COLORS.TEXT_DIM;
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillText('The golden Ledger sits on the pedestal. Three guards patrol.', CONFIG.FIELD_W / 2, 320);
    ctx.fillText('Cameras sweep the hall. One power cut — use it wisely.', CONFIG.FIELD_W / 2, 350);

    // Controls
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('CONTROLS', CONFIG.FIELD_W / 2, 420);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = COLORS.TEXT_DIM;
    const controls = [
      'WASD / Arrows — Move',
      'Shift — Sneak (half speed, half detection)',
      'Mouse Click — Throw Coin (3 coins, distracts guards)',
      'E — Interact (Grab loot, Open exit)',
      'Q — Cut Power (once, 10 seconds, blinds cameras)',
      'P / Esc — Pause',
      'Space / Click — Start / Restart',
    ];
    let cy = 460;
    for (const c of controls) {
      ctx.fillText(c, CONFIG.FIELD_W / 2, cy);
      cy += 28;
    }

    // Prompt
    ctx.fillStyle = COLORS.LOOT_GLOW;
    ctx.font = 'bold 22px sans-serif';
    const prompt = world.timing.gameTime > 0 ? 'Click or Press Space to Restart' : 'Click or Press Space to Begin';
    ctx.fillText(prompt, CONFIG.FIELD_W / 2, CONFIG.FIELD_H - 60);
  }

  function drawScreenPaused() {
    ctx.fillStyle = 'rgba(13, 18, 32, 0.9)';
    ctx.fillRect(0, 0, CONFIG.FIELD_W, CONFIG.FIELD_H);

    ctx.fillStyle = COLORS.LOOT_GLOW;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.LOOT_GLOW;
    ctx.shadowBlur = 15;
    ctx.fillText('PAUSED', CONFIG.FIELD_W / 2, CONFIG.FIELD_H / 2 - 20);
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.TEXT_DIM;
    ctx.font = '18px sans-serif';
    ctx.fillText('Press P or Esc to Resume', CONFIG.FIELD_W / 2, CONFIG.FIELD_H / 2 + 30);
  }

  function drawScreenWin(world) {
    ctx.fillStyle = 'rgba(13, 18, 32, 0.97)';
    ctx.fillRect(0, 0, CONFIG.FIELD_W, CONFIG.FIELD_H);

    // Victory
    ctx.fillStyle = COLORS.EXIT_GREEN;
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.EXIT_GREEN;
    ctx.shadowBlur = 25;
    ctx.fillText('HEIST COMPLETE', CONFIG.FIELD_W / 2, 180);
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '24px sans-serif';
    ctx.fillText('The Meridian Ledger is yours. Ghosted out clean.', CONFIG.FIELD_W / 2, 230);

    // Score breakdown
    const { score, timing } = world;
    const playTime = timing.gameTime - timing.startTime;
    const minutes = Math.floor(playTime / 60);
    const seconds = Math.floor(playTime % 60);

    ctx.font = '20px monospace';
    ctx.fillStyle = COLORS.TEXT_DIM;
    let sy = 300;
    const lines = [
      `Loot Points:      ${score.lootPoints.toString().padStart(6)}`,
      `Time Bonus:       ${score.timeBonus.toString().padStart(6)}  (${minutes}:${seconds.toString().padStart(2, '0')})`,
      `Alarm Penalty:   -${score.alarmPenalty.toString().padStart(6)}  (peak ${Math.round(score.peakAlarm)}%)`,
      `──────────────────────────────`,
      `FINAL SCORE:      ${score.final.toString().padStart(6)}`,
    ];
    for (const line of lines) {
      const color = line.startsWith('FINAL') ? COLORS.LOOT_GLOW : COLORS.TEXT;
      ctx.fillStyle = color;
      ctx.fillText(line, CONFIG.FIELD_W / 2, sy);
      sy += 32;
    }

    // Prompt
    ctx.fillStyle = COLORS.LOOT_GLOW;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Click or Press Space for Another Run', CONFIG.FIELD_W / 2, CONFIG.FIELD_H - 80);
  }

  function drawScreenCaught() {
    ctx.fillStyle = 'rgba(13, 18, 32, 0.97)';
    ctx.fillRect(0, 0, CONFIG.FIELD_W, CONFIG.FIELD_H);

    ctx.fillStyle = COLORS.ALARM_LOCKDOWN;
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = COLORS.ALARM_LOCKDOWN;
    ctx.shadowBlur = 25;
    ctx.fillText('CAUGHT', CONFIG.FIELD_W / 2, CONFIG.FIELD_H / 2 - 40);
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.TEXT_DIM;
    ctx.font = '20px sans-serif';
    ctx.fillText('The guards cornered you. The Ledger stays behind.', CONFIG.FIELD_W / 2, CONFIG.FIELD_H / 2 + 30);

    ctx.fillStyle = COLORS.LOOT_GLOW;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Click or Press Space to Retry', CONFIG.FIELD_W / 2, CONFIG.FIELD_H / 2 + 100);
  }

  // Main render function
  function render(world) {
    clear();
    drawFloor();
    drawVaultDoorBackdrop();
    drawVelvetRopes(world.velvetRopes);
    drawPedestal();
    drawDisplayCases();
    drawCoverObjects(world.coverObjects);
    drawLamps(world.lamps, world.powerCut.active);

    // Cones first (behind entities)
    for (const guard of world.guards) {
      drawGuardCone(guard, world.powerCut.active);
    }
    for (const cam of world.cameras) {
      drawCameraCone(cam);
    }

    // Entities
    drawExit(world.exit);
    drawLoot(world.lootItems, world.timing.gameTime);
    drawCoins(world.coins);
    for (const guard of world.guards) {
      drawGuard(guard);
    }
    for (const cam of world.cameras) {
      drawCamera(cam);
    }
    drawThief(world.thief);

    // Power cut banner
    if (world.powerCut.active) {
      drawPowerCutBanner(world);
    }

    // HUD & Legend
    drawHUD(world);
    drawLegend();

    // Screens
    switch (world.gameState) {
      case GAME_STATES.TITLE:
        drawScreenTitle(world);
        break;
      case GAME_STATES.PAUSED:
        drawScreenPaused();
        break;
      case GAME_STATES.WIN:
        drawScreenWin(world);
        break;
      case GAME_STATES.CAUGHT:
        drawScreenCaught();
        break;
    }
  }

  return { render };
}

// Helpers
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shadeColor(hex, percent) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = (100 + percent) / 100;
  const nr = Math.max(0, Math.min(255, Math.round(r * factor)));
  const ng = Math.max(0, Math.min(255, Math.round(g * factor)));
  const nb = Math.max(0, Math.min(255, Math.round(b * factor)));
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}