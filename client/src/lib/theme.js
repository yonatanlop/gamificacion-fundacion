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
  typography: { fontFamily: 'Poppins', headingScale: 1 },
  logo: '',
  optionColors: ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#0aa3a3', '#864cbf'],
  optionShapes: ['triangle', 'diamond', 'circle', 'square'],
  answerLayout: 'grid',
  showProgressBar: true,
  showTimer: true,
};

export const FONT_OPTIONS = ['Poppins', 'Nunito', 'Inter', 'system-ui'];

export function withDefaults(theme) {
  const t = theme || {};
  return {
    ...DEFAULT_THEME,
    ...t,
    palette: { ...DEFAULT_THEME.palette, ...(t.palette || {}) },
    typography: { ...DEFAULT_THEME.typography, ...(t.typography || {}) },
    optionColors: t.optionColors?.length ? t.optionColors : DEFAULT_THEME.optionColors,
  };
}

/** Devuelve { style, backgroundStyle } para aplicar el tema a un contenedor .game-theme */
export function themeToStyle(theme) {
  const t = withDefaults(theme);
  const p = t.palette;

  let background;
  if (p.backgroundMode === 'image' && p.backgroundImage) {
    background = `center / cover no-repeat url("${p.backgroundImage}"), ${p.background}`;
  } else if (p.backgroundMode === 'gradient') {
    background = `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1] || p.gradient[0]})`;
  } else {
    background = p.background;
  }

  return {
    style: {
      '--bg': p.background,
      '--text': p.text,
      '--primary': p.primary,
      '--card': p.card,
      '--card-text': p.cardText,
      '--font-family': t.typography.fontFamily,
      '--heading-scale': String(t.typography.headingScale || 1),
      background,
      color: p.text,
      fontFamily: `${t.typography.fontFamily}, Nunito, system-ui, sans-serif`,
      minHeight: '100%',
    },
    optionColor(i) {
      return t.optionColors[i % t.optionColors.length];
    },
    optionShape(i) {
      return t.optionShapes[i % t.optionShapes.length];
    },
    theme: t,
  };
}
