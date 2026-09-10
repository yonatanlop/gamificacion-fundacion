import { useState } from 'react';
import { Button, Input, Select, Textarea } from './ui.jsx';
import ImageInput from './ImageInput.jsx';

function emptyOption() {
  return { text: '', image: '', color: '', isCorrect: false };
}

function normalize(q) {
  if (!q) {
    return {
      type: 'SINGLE',
      text: '',
      image: '',
      timeLimit: 30,
      points: 1000,
      pointsMode: 'STANDARD',
      options: [
        { ...emptyOption(), isCorrect: true },
        emptyOption(),
        emptyOption(),
        emptyOption(),
      ],
    };
  }
  return {
    type: q.type,
    text: q.text,
    image: q.image || '',
    timeLimit: q.timeLimit,
    points: q.points,
    pointsMode: q.pointsMode,
    options: q.options.map((o) => ({
      text: o.text || '',
      image: o.image || '',
      color: o.color || '',
      isCorrect: !!o.isCorrect,
    })),
  };
}

export default function QuestionForm({ initial, onSave, onCancel, saving }) {
  const [q, setQ] = useState(() => normalize(initial));
  const [err, setErr] = useState('');

  function setType(type) {
    if (type === 'TRUE_FALSE') {
      setQ({
        ...q,
        type,
        options: [
          { ...emptyOption(), text: 'Verdadero', isCorrect: true },
          { ...emptyOption(), text: 'Falso', isCorrect: false },
        ],
      });
    } else {
      setQ({ ...q, type });
    }
  }

  function setOption(i, patch) {
    const options = q.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    setQ({ ...q, options });
  }

  function toggleCorrect(i) {
    if (q.type === 'MULTIPLE') {
      setOption(i, { isCorrect: !q.options[i].isCorrect });
    } else {
      setQ({ ...q, options: q.options.map((o, idx) => ({ ...o, isCorrect: idx === i })) });
    }
  }

  function addOption() {
    if (q.options.length >= 6) return;
    setQ({ ...q, options: [...q.options, emptyOption()] });
  }

  function removeOption(i) {
    if (q.options.length <= 2) return;
    setQ({ ...q, options: q.options.filter((_, idx) => idx !== i) });
  }

  function submit() {
    setErr('');
    if (!q.text.trim()) return setErr('Escribe el enunciado de la pregunta.');
    const filled = q.options.filter((o) => o.text.trim() || o.image.trim());
    if (filled.length < 2) return setErr('Necesitas al menos 2 opciones con texto o imagen.');
    if (!q.options.some((o) => o.isCorrect)) return setErr('Marca al menos una opción correcta.');
    if (q.type === 'SINGLE' && q.options.filter((o) => o.isCorrect).length !== 1) {
      return setErr('En opción única debe haber exactamente una respuesta correcta.');
    }
    const payload = {
      type: q.type,
      text: q.text.trim(),
      image: q.image.trim(),
      timeLimit: Number(q.timeLimit) || 30,
      points: Number(q.points) || 0,
      pointsMode: q.pointsMode,
      options: q.options
        .filter((o) => o.text.trim() || o.image.trim() || q.type === 'TRUE_FALSE')
        .map((o) => ({
          text: o.text.trim(),
          image: o.image.trim(),
          color: o.color.trim(),
          isCorrect: !!o.isCorrect,
        })),
    };
    return onSave(payload);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Tipo" value={q.type} onChange={(e) => setType(e.target.value)}>
          <option value="SINGLE">Opción única</option>
          <option value="MULTIPLE">Opción múltiple</option>
          <option value="TRUE_FALSE">Verdadero / Falso</option>
        </Select>
        <Input
          label="Tiempo (segundos)"
          type="number"
          min="5"
          max="240"
          value={q.timeLimit}
          onChange={(e) => setQ({ ...q, timeLimit: e.target.value })}
        />
        <Select label="Puntos" value={q.pointsMode} onChange={(e) => setQ({ ...q, pointsMode: e.target.value })}>
          <option value="STANDARD">Estándar</option>
          <option value="DOUBLE">Dobles</option>
          <option value="ZERO">Sin puntos</option>
        </Select>
      </div>

      <Textarea
        label="Enunciado"
        rows={2}
        value={q.text}
        onChange={(e) => setQ({ ...q, text: e.target.value })}
      />
      <Input
        label="Puntaje base"
        type="number"
        min="0"
        max="10000"
        value={q.points}
        onChange={(e) => setQ({ ...q, points: e.target.value })}
      />
      <ImageInput label="Imagen de la pregunta (opcional)" value={q.image} onChange={(v) => setQ({ ...q, image: v })} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Opciones de respuesta</span>
          {q.type !== 'TRUE_FALSE' && (
            <Button variant="ghost" onClick={addOption} disabled={q.options.length >= 6}>
              + Opción
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {q.options.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
              <button
                type="button"
                onClick={() => toggleCorrect(i)}
                title="Marcar como correcta"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  o.isCorrect ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 text-slate-400'
                }`}
              >
                ✓
              </button>
              <input
                type="text"
                placeholder={`Opción ${i + 1}`}
                value={o.text}
                disabled={q.type === 'TRUE_FALSE'}
                onChange={(e) => setOption(i, { text: e.target.value })}
                className="min-w-[8rem] flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
              <input
                type="color"
                title="Color propio de la opción"
                value={/^#[0-9a-fA-F]{6}$/.test(o.color) ? o.color : '#cccccc'}
                onChange={(e) => setOption(i, { color: e.target.value })}
                className="h-8 w-9 cursor-pointer rounded border border-slate-300"
              />
              {q.type !== 'TRUE_FALSE' && (
                <div className="w-full sm:w-64">
                  <ImageInput label="" compact value={o.image} onChange={(v) => setOption(i, { image: v })} />
                </div>
              )}
              {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                <Button variant="ghost" onClick={() => removeOption(i)}>
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar pregunta'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
