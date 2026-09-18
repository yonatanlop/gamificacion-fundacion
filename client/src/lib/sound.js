let ctx;

function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { duration = 0.15, type = 'sine', gain = 0.2, delay = 0 } = {}) {
  const audio = getCtx();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Pequeño "pop" al reventar un globo. */
export function playPop() {
  tone(650, { duration: 0.09, type: 'triangle', gain: 0.22 });
  tone(280, { duration: 0.12, type: 'triangle', gain: 0.15, delay: 0.03 });
}

/** Tonada corta ascendente al ganar. */
export function playWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone(freq, { duration: 0.28, type: 'sine', gain: 0.18, delay: i * 0.12 }),
  );
}
