import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Card, Button, Spinner } from '../../components/ui.jsx';
import { buildIconUrl } from '../../components/IconPicker.jsx';
import { expandSearchTerms } from '../../lib/iconSynonyms.js';

const PAGE = 150;

export default function IconLibraryPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['icons-manifest'],
    queryFn: () => api.get('/icons/manifest'),
    staleTime: Infinity,
  });

  const [tab, setTab] = useState('tabler');
  const [q, setQ] = useState('');
  const [color, setColor] = useState('#111827');
  const [stroke, setStroke] = useState(2);
  const [size, setSize] = useState(64);
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!q.trim()) return data.icons.filter((i) => i.set === tab);
    const terms = expandSearchTerms(q);
    return data.icons.filter(
      (i) => i.set === tab && terms.some((term) => i.name.includes(term) || i.tags.some((t) => t.includes(term))),
    );
  }, [data, tab, q]);

  const visible = filtered.slice(0, limit);
  const activeSource = data?.sources.find((s) => s.set === tab);
  const recolorable = activeSource?.recolorable !== false;
  const opts = recolorable ? { color, stroke, size } : { size };
  const selectedSource = selected && data?.sources.find((s) => s.set === selected.set);

  function downloadIcon(icon) {
    const a = document.createElement('a');
    a.href = buildIconUrl(icon, opts);
    a.download = `${icon.set}-${icon.name}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function copyUrl(icon) {
    const url = `${window.location.origin}${buildIconUrl(icon, opts)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (isError) return <p className="text-red-600">No se pudo cargar la librería de íconos.</p>;

  return (
    <div className="space-y-4 pb-28">
      <div>
        <h1 className="font-display text-xl font-bold">Biblioteca de íconos</h1>
        <p className="text-sm text-slate-500">
          Busca, personaliza y descarga íconos SVG gratuitos — de línea (Tabler, Lucide, recoloreables) o a color fijo
          (Fluent Emoji, Noto). Libres de usar y modificar. Puedes buscar en español o en inglés.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
              setSelected(null);
            }}
            placeholder="Buscar: bombillo, casa, house, arrow…"
            className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-1">
            {(data?.sources || []).map((s) => (
              <button
                key={s.set}
                type="button"
                onClick={() => {
                  setTab(s.set);
                  setLimit(PAGE);
                  setSelected(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  tab === s.set ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label} ({s.count})
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {recolorable ? (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Color
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-9 cursor-pointer rounded border border-slate-300"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Grosor
                <input type="range" min="0.5" max="3.5" step="0.25" value={stroke} onChange={(e) => setStroke(e.target.value)} />
              </label>
            </>
          ) : (
            <span className="text-sm text-slate-500">Íconos a color fijo — no se pueden recolorear.</span>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Tamaño
            <input type="range" min="24" max="256" step="8" value={size} onChange={(e) => setSize(e.target.value)} />
          </label>
          <span className="text-xs text-slate-400">Los cambios se aplican a la vista previa y a la descarga.</span>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <p className="text-slate-500">Sin resultados para "{q}".</p>
      ) : (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-10">
          {visible.map((icon) => (
            <button
              key={icon.id}
              type="button"
              title={icon.name}
              onClick={() => setSelected(icon)}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-2 hover:border-indigo-400 hover:bg-indigo-50 ${
                selected?.id === icon.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300' : 'border-slate-200'
              }`}
            >
              <img src={buildIconUrl(icon, { ...opts, size: 32 })} alt={icon.name} className="h-6 w-6" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
            Cargar más ({filtered.length - limit} restantes)
          </Button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
            <img src={buildIconUrl(selected, { ...opts, size: 56 })} alt={selected.name} className="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{selected.name}</p>
              <p className="text-xs text-slate-500">
                {selectedSource ? `${selectedSource.label} (${selectedSource.license})` : selected.set}
              </p>
            </div>
            <Button variant="secondary" onClick={() => copyUrl(selected)}>
              {copied ? '¡Copiado!' : 'Copiar URL'}
            </Button>
            <Button onClick={() => downloadIcon(selected)}>Descargar SVG</Button>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
