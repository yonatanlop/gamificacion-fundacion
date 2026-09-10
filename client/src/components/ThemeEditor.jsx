import { withDefaults, FONT_OPTIONS, DEFAULT_THEME } from '../lib/theme.js';
import { Select, Toggle, ColorField } from './ui.jsx';
import ImageInput from './ImageInput.jsx';

const PRESETS = {
  Fundación: DEFAULT_THEME,
  Claro: {
    ...DEFAULT_THEME,
    palette: {
      ...DEFAULT_THEME.palette,
      backgroundMode: 'color',
      background: '#f1f5f9',
      text: '#0f172a',
      primary: '#2563eb',
      cardText: '#0f172a',
    },
  },
  Noche: {
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

export default function ThemeEditor({ value, onChange }) {
  const theme = withDefaults(value);
  const p = theme.palette;

  const setPalette = (key, v) => onChange({ ...theme, palette: { ...p, [key]: v } });
  const setTypo = (key, v) =>
    onChange({ ...theme, typography: { ...theme.typography, [key]: v } });
  const set = (key, v) => onChange({ ...theme, [key]: v });

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Presets</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange(withDefaults(preset))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-800">Fondo</p>
        <Select
          label="Modo de fondo"
          value={p.backgroundMode}
          onChange={(e) => setPalette('backgroundMode', e.target.value)}
        >
          <option value="color">Color sólido</option>
          <option value="gradient">Degradado</option>
          <option value="image">Imagen</option>
        </Select>
        <div className="mt-2 space-y-1">
          <ColorField label="Color de fondo" value={p.background} onChange={(v) => setPalette('background', v)} />
          {p.backgroundMode === 'gradient' && (
            <>
              <ColorField
                label="Degradado — inicio"
                value={p.gradient?.[0]}
                onChange={(v) => setPalette('gradient', [v, p.gradient?.[1] || v])}
              />
              <ColorField
                label="Degradado — fin"
                value={p.gradient?.[1]}
                onChange={(v) => setPalette('gradient', [p.gradient?.[0] || v, v])}
              />
            </>
          )}
          {p.backgroundMode === 'image' && (
            <ImageInput
              label="Imagen de fondo"
              value={p.backgroundImage}
              onChange={(v) => setPalette('backgroundImage', v)}
            />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-800">Colores</p>
        <ColorField label="Texto" value={p.text} onChange={(v) => setPalette('text', v)} />
        <ColorField label="Color primario (botones)" value={p.primary} onChange={(v) => setPalette('primary', v)} />
        <ColorField label="Tarjeta" value={p.card} onChange={(v) => setPalette('card', v)} />
        <ColorField label="Texto de tarjeta" value={p.cardText} onChange={(v) => setPalette('cardText', v)} />
        <div className="mt-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">Colores de las opciones</span>
          <div className="flex flex-wrap gap-2">
            {theme.optionColors.map((c, i) => (
              <input
                key={i}
                type="color"
                value={c}
                onChange={(e) => {
                  const next = [...theme.optionColors];
                  next[i] = e.target.value;
                  set('optionColors', next);
                }}
                className="h-8 w-10 cursor-pointer rounded border border-slate-300"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-800">Tipografía y marca</p>
        <Select label="Fuente" value={theme.typography.fontFamily} onChange={(e) => setTypo('fontFamily', e.target.value)}>
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <label className="mt-2 block text-sm text-slate-700">
          Tamaño de títulos: {Math.round((theme.typography.headingScale || 1) * 100)}%
          <input
            type="range"
            min="0.7"
            max="1.6"
            step="0.05"
            value={theme.typography.headingScale || 1}
            onChange={(e) => setTypo('headingScale', Number(e.target.value))}
            className="w-full"
          />
        </label>
        <ImageInput label="Logo" value={theme.logo} onChange={(v) => set('logo', v)} />
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-800">Disposición</p>
        <Select label="Distribución de respuestas" value={theme.answerLayout} onChange={(e) => set('answerLayout', e.target.value)}>
          <option value="grid">Cuadrícula</option>
          <option value="list">Lista</option>
        </Select>
        <div className="mt-2">
          <Toggle label="Mostrar barra de progreso" checked={theme.showProgressBar} onChange={(v) => set('showProgressBar', v)} />
          <Toggle label="Mostrar temporizador" checked={theme.showTimer} onChange={(v) => set('showTimer', v)} />
        </div>
      </div>
    </div>
  );
}
