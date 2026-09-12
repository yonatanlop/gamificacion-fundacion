import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Button } from './ui.jsx';
import { expandSearchTerms } from '../lib/iconSynonyms.js';

const PAGE = 120;

export function buildIconUrl(icon, { color, stroke, size } = {}) {
  const params = new URLSearchParams();
  if (color) params.set('color', color);
  if (stroke) params.set('stroke', stroke);
  if (size) params.set('size', size);
  const qs = params.toString();
  return `/icons/${icon.set}/${icon.name}.svg${qs ? `?${qs}` : ''}`;
}

/**
 * Selector de íconos (Tabler + Lucide, miles de opciones, SVG autoalojados).
 * Al elegir uno, llama onPick(url) con la URL ya personalizada (color/grosor/
 * tamaño) — esa URL se guarda como cualquier otra imagen en el campo `image`.
 */
export default function IconPicker({ onPick, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['icons-manifest'],
    queryFn: () => api.get('/icons/manifest'),
    staleTime: Infinity,
  });

  const [tab, setTab] = useState('tabler');
  const [q, setQ] = useState('');
  const [color, setColor] = useState('#111827');
  const [stroke, setStroke] = useState(2);
  const [size, setSize] = useState(48);
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!q.trim()) return data.icons.filter((i) => i.set === tab);
    const terms = expandSearchTerms(q);
    return data.icons.filter(
      (i) => i.set === tab && terms.some((term) => i.name.includes(term) || i.tags.some((t) => t.includes(term))),
    );
  }, [data, tab, q]);

  const visible = filtered.slice(0, limit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 p-4">
          <h3 className="font-display text-lg font-bold">Elegir ícono</h3>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Buscar: bombillo, casa, house, arrow…"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-1">
            {(data?.sources || []).map((s) => (
              <button
                key={s.set}
                type="button"
                onClick={() => {
                  setTab(s.set);
                  setLimit(PAGE);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  tab === s.set ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label} ({s.count})
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-9 cursor-pointer rounded border border-slate-300"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Grosor
            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.25"
              value={stroke}
              onChange={(e) => setStroke(e.target.value)}
              className="w-20"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Tamaño
            <input
              type="range"
              min="24"
              max="128"
              step="8"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-20"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-sm text-slate-500">Cargando íconos…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-slate-500">Sin resultados para "{q}".</p>
          ) : (
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {visible.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  title={icon.name}
                  onClick={() => onPick(buildIconUrl(icon, { color, stroke, size }))}
                  className="flex aspect-square items-center justify-center rounded-lg border border-slate-200 p-2 hover:border-indigo-400 hover:bg-indigo-50"
                >
                  <img
                    src={buildIconUrl(icon, { color, stroke, size: 32 })}
                    alt={icon.name}
                    className="h-6 w-6"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
          {filtered.length > limit && (
            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                Cargar más ({filtered.length - limit} restantes)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
