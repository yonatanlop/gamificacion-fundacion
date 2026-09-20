export const DEFAULT_THEME = {
  palette: {
    backgroundMode: 'gradient',
    background: '#1e1b4b',
    backgroundImage: '',
    gradient: ['#4f46e5', '#9333ea'],
    text: '#ffffff',
    primary: '#22c55e',
    card: '#ffffff',
    cardText: '#111827',
  },
  typography: {
    fontFamily: 'Poppins',
    headingScale: 1,
  },
  logo: '',
  optionColors: ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#0aa3a3', '#864cbf'],
  optionShapes: ['triangle', 'diamond', 'circle', 'square'],
  answerLayout: 'grid',
  showProgressBar: true,
  showTimer: true,
};

export const DEFAULT_SETTINGS = {
  askNickname: true,
  showCorrectAtEnd: true,
  shuffleQuestions: false,
  shuffleAnswers: false,
  showProgressBar: true,
  showTimer: true,
  defaultTimeLimit: 30,
  defaultPoints: 1000,
};

// Ajustes propios del tipo "Sondeo / Consulta rápida".
export const DEFAULT_SURVEY_SETTINGS = {
  askNickname: true,
  nicknameLabel: 'Tu nombre',
  shuffleQuestions: false,
  shuffleAnswers: false,
  showProgressBar: true,
  acceptingResponses: true, // si es false, el sondeo está "cerrado" y no admite respuestas
  resultsVisibility: 'admin', // 'admin' | 'end' | 'never'
  closingMessage: '¡Listo! Tu respuesta quedó registrada. Muchas gracias.',
};

// Sonidos por defecto de "Globos": presets generados por código, sin archivo
// propio. El profesor puede cambiar el preset o subir un audio en Ajustes.
export const DEFAULT_BALLOON_SOUNDS = {
  start: { enabled: true, preset: 'chime', url: null },
  pop: { enabled: true, preset: 'classic', url: null },
  correct: { enabled: true, preset: 'applause', url: null },
  incorrect: { enabled: true, preset: 'buzz', url: null },
  win: { enabled: true, preset: 'fanfare', url: null },
};

// Ajustes propios del tipo "Globos".
export const DEFAULT_BALLOONS_SETTINGS = {
  askNickname: true,
  nicknameLabel: 'Tu nombre',
  closingMessage: '¡Reventaste todos los globos! Gracias por participar.',
  sounds: DEFAULT_BALLOON_SOUNDS,
};

// Ajustes propios del tipo "Botella" (ruleta de preguntas para presentar).
export const DEFAULT_BOTTLE_SETTINGS = {
  closingMessage: '¡Repasamos todas las preguntas!',
};

// Ajustes propios del tipo "Tuberías": narrativa entre preguntas y, desde
// cierto punto, un límite de tiempo ("oxígeno") por pregunta.
export const DEFAULT_PIPES_SETTINGS = {
  askNickname: true,
  nicknameLabel: 'Tu nombre',
  closingMessage: '¡Lo lograste! Gracias por jugar.',
  timedFromIndex: -1, // -1 = nunca cronometrado
  oxygenSeconds: 20,
  storyBeats: [], // [{ beforeIndex: number, text: string }]
};

export const THEME_PRESETS = {
  clasico: DEFAULT_THEME,
  claro: {
    ...DEFAULT_THEME,
    palette: {
      ...DEFAULT_THEME.palette,
      backgroundMode: 'color',
      background: '#f1f5f9',
      text: '#0f172a',
      primary: '#2563eb',
      card: '#ffffff',
      cardText: '#0f172a',
    },
  },
  noche: {
    ...DEFAULT_THEME,
    palette: {
      ...DEFAULT_THEME.palette,
      backgroundMode: 'color',
      background: '#0b1020',
      text: '#e2e8f0',
      primary: '#38bdf8',
      card: '#111827',
      cardText: '#e2e8f0',
    },
  },
};

/** Combina un tema parcial con los valores por defecto (merge superficial por sección). */
export function mergeTheme(partial) {
  const p = partial || {};
  return {
    ...DEFAULT_THEME,
    ...p,
    palette: { ...DEFAULT_THEME.palette, ...(p.palette || {}) },
    typography: { ...DEFAULT_THEME.typography, ...(p.typography || {}) },
  };
}

export function mergeSettings(partial, type = 'QUIZ') {
  const base =
    type === 'SURVEY'
      ? DEFAULT_SURVEY_SETTINGS
      : type === 'BALLOONS'
        ? DEFAULT_BALLOONS_SETTINGS
        : type === 'BOTTLE'
          ? DEFAULT_BOTTLE_SETTINGS
          : type === 'PIPES'
            ? DEFAULT_PIPES_SETTINGS
            : DEFAULT_SETTINGS;
  return { ...base, ...(partial || {}) };
}
