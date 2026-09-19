import { useState } from 'react';
import { api } from '../api/client.js';
import { Button, Toggle } from './ui.jsx';
import { SOUND_PRESETS, testSound } from '../lib/sound.js';

/**
 * Un evento de sonido configurable (inicio, reventar, correcto, incorrecto,
 * victoria): activar/desactivar, elegir un preset generado por código, o
 * subir un archivo de audio propio que reemplaza al preset.
 */
export default function SoundField({ label, eventKey, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const presets = SOUND_PRESETS[eventKey] || [];
  const cfg = value || { enabled: true, preset: presets[0]?.value, url: null };

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { url } = await api.upload(file);
      onChange({ ...cfg, url });
    } catch (err) {
      setError(err.message || 'No se pudo subir el audio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
      <div className="min-w-[8rem]">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {cfg.url && <p className="text-xs text-indigo-600">Usando archivo propio</p>}
      </div>

      <Toggle label="Activado" checked={cfg.enabled !== false} onChange={(v) => onChange({ ...cfg, enabled: v })} />

      <select
        value={cfg.preset || presets[0]?.value}
        disabled={!!cfg.url}
        onChange={(e) => onChange({ ...cfg, preset: e.target.value })}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
      >
        {presets.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <label className="cursor-pointer">
        <span className="inline-flex items-center rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-300">
          {busy ? 'Subiendo…' : 'Subir audio'}
        </span>
        <input type="file" accept="audio/*" className="hidden" onChange={handleFile} disabled={busy} />
      </label>

      {cfg.url && (
        <Button variant="ghost" onClick={() => onChange({ ...cfg, url: null })}>
          Quitar archivo
        </Button>
      )}

      <Button variant="secondary" onClick={() => testSound(eventKey, cfg)}>
        ▶ Probar
      </Button>

      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
