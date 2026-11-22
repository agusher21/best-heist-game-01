// Game configuration: all tunable numbers in one place.

export const CONFIG = {
  // Field
  FIELD_W: 1280,
  FIELD_H: 720,

  // Thief
  THIEF_SPEED: 180,         // px/s
  THIEF_SNEAK_MULT: 0.5,    // half speed when sneaking
  THIEF_RADIUS: 14,
  LOOT_SLOW_PER_ITEM: 0.08, // 8% slower per carried loot

  // Guards
  GUARD_SPEED: 110,
  GUARD_VISION_RANGE: 260,
  GUARD_VISION_ANGLE: 70 * Math.PI / 180, // 70 degrees in radians
  GUARD_SUSPICION_TIME: 1.5,   // seconds to investigate
  GUARD_DETECTION_RATE: 25,    // alarm per second when seen
  GUARD_SNEAK_DETECTION_MULT: 0.5,

  // Cameras
  CAMERA_SWEEP_SPEED: 0.6,     // rad/s
  CAMERA_SWEEP_RANGE: Math.PI / 2, // 90 degree sweep
  CAMERA_VISION_RANGE: 300,
  CAMERA_VISION_ANGLE: 50 * Math.PI / 180,
  CAMERA_DETECTION_RATE: 40,   // alarm per second when seen

  // Alarm
  ALARM_MAX: 100,
  ALARM_DECAY: 8,              // per second when hidden
  ALARM_SUSPICIOUS: 30,
  ALARM_ALARM: 70,
  LOCKDOWN_DURATION: 10,       // seconds
  LOCKDOWN_ALARM_DROP: 60,     // alarm drops to this after lockdown

  // Power cut
  POWER_CUT_DURATION: 10,      // seconds
  POWER_CUT_CONE_MULT: 0.3,    // guard cones shrink to 30%

  // Loot
  LOOT_LEDGER_POINTS: 500,
  LOOT_GOLD_BAR_POINTS: 100,
  GOLD_BARS_COUNT: 3,

  // Coins
  COIN_COUNT: 3,
  COIN_THROW_RANGE: 400,

  // Colors
  COLORS: {
    BG: '#0d1220',
    FLOOR: '#141a2e',
    WALL: '#0a0e1a',
    LAMP_POOL: '#f2c94c',
    LAMP_POOL_ALPHA: 0.18,
    GUARD_CONE: '#ffb300',
    GUARD_CONE_ALPHA: 0.22,
    GUARD_CONE_SUSPICIOUS: '#ffd600',
    GUARD_CONE_ALERT: '#ff3d00',
    CAMERA_CONE: '#ff1744',
    CAMERA_CONE_ALPHA: 0.25,
    LOOT_GLOW: '#ffd700',
    LOOT_GLOW_ALPHA: 0.35,
    EXIT_GREEN: '#00e676',
    EXIT_GREEN_ALPHA: 0.3,
    THIEF: '#ffffff',
    THIEF_SNEAK: '#b0bec5',
    GUARD_BODY: '#37474f',
    GUARD_HEAD: '#546e7a',
    CRATE: '#3e2723',
    PILLAR: '#455a64',
    PLANT: '#1b5e20',
    VELVET_ROPE: '#3e2723',
    PEDESTAL: '#5d4037',
    VAULT_DOOR: '#263238',
    TEXT: '#e8eaf6',
    TEXT_DIM: '#90a4ae',
    HUD_BG: 'rgba(13, 18, 32, 0.92)',
    HUD_BORDER: '#37474f',
    ALARM_CALM: '#00e676',
    ALARM_SUSPICIOUS: '#ffd600',
    ALARM_ALARM: '#ff6d00',
    ALARM_LOCKDOWN: '#ff1744',
    COIN: '#ffd700',
    POWER_CUT_BANNER: '#ff1744',
    SPEECH_BG: 'rgba(13, 18, 32, 0.95)',
    SPEECH_BORDER: '#ffb300',
    SPEECH_TEXT: '#fff8e1',
  },

  // UI
  FONT_LARGE: 'bold 28px "Segoe UI", "Noto Sans", sans-serif',
  FONT_MEDIUM: 'bold 20px "Segoe UI", "Noto Sans", sans-serif',
  FONT_SMALL: '14px "Segoe UI", "Noto Sans", sans-serif',
  FONT_TINY: '12px "Segoe UI", "Noto Sans", sans-serif',
  HUD_HEIGHT: 90,
  LEGEND_W: 220,
  LEGEND_H: 160,
};