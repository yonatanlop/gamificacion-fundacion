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

/** Ráfaga de ruido filtrado (base de aplausos/chispas). */
function noiseBurst({ duration = 0.2, delay = 0, gain = 0.25, filterFreq = 1500, filterQ = 0.7 } = {}) {
  const audio = getCtx();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;
  const g = audio.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  src.connect(filter).connect(g).connect(audio.destination);
  src.start(start);
  src.stop(start + duration + 0.02);
}

/** Varias ráfagas cortas espaciadas — simula el "clap-clap-clap" de un aplauso. */
function applauseClaps(count, { spread = 0.09, filterFreq = 2200 } = {}) {
  for (let i = 0; i < count; i++) {
    noiseBurst({ duration: 0.08, delay: i * spread * (0.7 + Math.random() * 0.6), gain: 0.18, filterFreq: filterFreq + Math.random() * 600 });
  }
}

/* ------------------------------- Presets -------------------------------- */

const START_PRESETS = {
  chime: () => {
    tone(659.25, { duration: 0.16, type: 'sine', gain: 0.18 });
    tone(987.77, { duration: 0.22, type: 'sine', gain: 0.16, delay: 0.12 });
  },
  bell: () => tone(523.25, { duration: 0.5, type: 'triangle', gain: 0.2 }),
};

const POP_PRESETS = {
  classic: () => {
    tone(650, { duration: 0.09, type: 'triangle', gain: 0.22 });
    tone(280, { duration: 0.12, type: 'triangle', gain: 0.15, delay: 0.03 });
  },
  bubble: () => tone(1200, { duration: 0.07, type: 'sine', gain: 0.2 }),
};

const CORRECT_PRESETS = {
  applause: () => applauseClaps(10, { spread: 0.1 }),
  cheer: () => {
    [523.25, 659.25, 783.99].forEach((f, i) => tone(f, { duration: 0.2, type: 'sine', gain: 0.16, delay: i * 0.08 }));
    applauseClaps(6, { spread: 0.09, filterFreq: 2600 });
  },
};

const INCORRECT_PRESETS = {
  buzz: () => tone(180, { duration: 0.35, type: 'sawtooth', gain: 0.18 }),
  oops: () => {
    tone(220, { duration: 0.12, type: 'square', gain: 0.15 });
    tone(160, { duration: 0.18, type: 'square', gain: 0.15, delay: 0.15 });
  },
};

const WIN_PRESETS = {
  fanfare: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { duration: 0.28, type: 'sine', gain: 0.18, delay: i * 0.12 })),
  party: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, { duration: 0.3, type: 'sine', gain: 0.17, delay: i * 0.11 }));
    applauseClaps(14, { spread: 0.07, filterFreq: 3000 });
  },
};

function playSoundEvent(config, presetMap, fallbackPreset) {
  const cfg = config || { enabled: true, preset: fallbackPreset };
  if (cfg.enabled === false) return;
  if (cfg.url) {
    const audio = new Audio(cfg.url);
    audio.play().catch(() => {});
    return;
  }
  const fn = presetMap[cfg.preset] || presetMap[fallbackPreset];
  fn?.();
}

export const SOUND_PRESETS = {
  start: [
    { value: 'chime', label: 'Campanita' },
    { value: 'bell', label: 'Timbre' },
  ],
  pop: [
    { value: 'classic', label: 'Pop clásico' },
    { value: 'bubble', label: 'Burbuja' },
  ],
  correct: [
    { value: 'applause', label: 'Aplausos' },
    { value: 'cheer', label: 'Ovación' },
  ],
  incorrect: [
    { value: 'buzz', label: 'Zumbido' },
    { value: 'oops', label: 'Ups (dos bips)' },
  ],
  win: [
    { value: 'fanfare', label: 'Fanfarria' },
    { value: 'party', label: 'Fiesta' },
  ],
};

export const DEFAULT_SOUNDS = Object.fromEntries(
  Object.entries(SOUND_PRESETS).map(([key, presets]) => [key, { enabled: true, preset: presets[0].value, url: null }]),
);

export function playStart(config) {
  playSoundEvent(config, START_PRESETS, 'chime');
}
export function playPopSound(config) {
  playSoundEvent(config, POP_PRESETS, 'classic');
}
export function playCorrect(config) {
  playSoundEvent(config, CORRECT_PRESETS, 'applause');
}
export function playIncorrect(config) {
  playSoundEvent(config, INCORRECT_PRESETS, 'buzz');
}
export function playWinSound(config) {
  playSoundEvent(config, WIN_PRESETS, 'fanfare');
}

/** Reproduce un evento de sonido puntual, usado por el botón "Probar" del editor. */
export function testSound(eventKey, config) {
  const map = { start: playStart, pop: playPopSound, correct: playCorrect, incorrect: playIncorrect, win: playWinSound };
  map[eventKey]?.(config);
}
