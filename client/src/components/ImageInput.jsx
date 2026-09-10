import { useState } from 'react';
import { api } from '../api/client.js';
import { Button } from './ui.jsx';

/**
 * Campo de imagen: permite subir un archivo (al volumen del servidor) o pegar una URL.
 * value = string (URL o /uploads/...). onChange(nuevoValor).
 */
export default function ImageInput({ label = 'Imagen', value, onChange, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { url } = await api.upload(file);
      onChange(url);
    } catch (err) {
      setError(err.message || 'No se pudo subir la imagen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && <span className="block text-sm font-medium text-slate-700">{label}</span>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="https://… o sube un archivo"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="cursor-pointer">
          <span className="inline-flex items-center rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300">
            {busy ? 'Subiendo…' : 'Subir'}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
        </label>
        {value && (
          <Button variant="ghost" onClick={() => onChange('')}>
            Quitar
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value && !compact && (
        <img
          src={value}
          alt=""
          className="max-h-40 rounded-lg border border-slate-200 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
