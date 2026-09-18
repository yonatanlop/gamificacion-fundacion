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

// Ajustes propios del tipo "Globos".
export const DEFAULT_BALLOONS_SETTINGS = {
  askNickname: true,
  nicknameLabel: 'Tu nombre',
  closingMessage: '¡Reventaste todos los globos! Gracias por participar.',
};

// Ajustes propios del tipo "Botella" (ruleta de preguntas para presentar).
export const DEFAULT_BOTTLE_SETTINGS = {
  closingMessage: '¡Repasamos todas las preguntas!',
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
          : DEFAULT_SETTINGS;
  return { ...base, ...(partial || {}) };
}
