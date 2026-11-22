// WebAudio synthesis: footstep ticks, coin clink, alarm swell, power-cut hum, win chime.

export function createAudio() {
  let ctx = null;
  let masterGain = null;
  let initialized = false;

  function init() {
    if (initialized) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);
    initialized = true;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // Footstep: short low tick
  function playFootstep() {
    if (!initialized) init();
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 80;
    gain.gain.value = 0.05;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  // Sneak footstep: softer
  function playSneakStep() {
    if (!initialized) init();
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 60;
    gain.gain.value = 0.02;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  // Coin clink: bright metallic
  function playCoin() {
    if (!initialized) init();
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  // Spot detection: sharp ping
  function playSpot() {
    if (!initialized) init();
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  // Alarm swell: rising tension
  function playAlarm() {
    if (!initialized) init();
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 2);
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 4);
  }

  // Lockdown: intense alarm
  function playLockdown() {
    if (!initialized) init();
    resume();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300 + i * 100, ctx.currentTime + i * 0.15);
      osc.frequency.linearRampToValueAtTime(600 + i * 100, ctx.currentTime + 0.3 + i * 0.15);
      gain.gain.value = 0.05;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4 + i * 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + 0.5 + i * 0.15);
    }
  }

  // Power cut: deep hum
  function playPowerCut() {
    if (!initialized) init();
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 2);
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    gain.gain.value = 0.1;
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 2.5);
  }

  // Loot pickup: pleasant chime
  function playLoot() {
    if (!initialized) init();
    resume();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.06;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3 + i * 0.1);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.5 + i * 0.08);
    });
  }

  // Win: triumphant fanfare
  function playWin() {
    if (!initialized) init();
    resume();
    const melody = [
      { f: 523.25, t: 0, d: 0.2 },   // C5
      { f: 659.25, t: 0.15, d: 0.2 }, // E5
      { f: 783.99, t: 0.3, d: 0.2 },  // G5
      { f: 1046.5, t: 0.5, d: 0.5 },  // C6
    ];
    melody.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = n.f;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.t + n.d);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + n.t);
      osc.stop(ctx.currentTime + n.t + n.d);
    });
  }

  // Caught: sad trombone
  function playCaught() {
    if (!initialized) init();
    resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.8);
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  }

  // Ambient hum (subtle)
  let ambientOsc = null;
  let ambientGain = null;

  function startAmbient() {
    if (!initialized) init();
    if (ambientOsc) return;
    ambientOsc = ctx.createOscillator();
    ambientGain = ctx.createGain();
    ambientOsc.type = 'sine';
    ambientOsc.frequency.value = 35;
    ambientGain.gain.value = 0.01;
    ambientOsc.connect(ambientGain);
    ambientGain.connect(masterGain);
    ambientOsc.start();
  }

  function stopAmbient() {
    if (ambientOsc) {
      ambientOsc.stop();
      ambientOsc = null;
      ambientGain = null;
    }
  }

  return {
    init,
    resume,
    playFootstep,
    playSneakStep,
    playCoin,
    playSpot,
    playAlarm,
    playLockdown,
    playPowerCut,
    playLoot,
    playWin,
    playCaught,
    startAmbient,
    stopAmbient,
  };
}