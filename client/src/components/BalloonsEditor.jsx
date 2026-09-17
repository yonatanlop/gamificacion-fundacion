import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Button, Card, Select, Textarea, ConfirmButton } from './ui.jsx';
import ImageInput from './ImageInput.jsx';

const SPEED_LABEL = { SLOW: 'Lento', MEDIUM: 'Medio', FAST: 'Rápido' };

function emptyOption() {
  return { text: '', image: '', color: '', isCorrect: false };
}

function normalize(q) {
  if (!q) {
    return {
      type: 'SINGLE',
      text: '',
      image: '',
      balloonColor: '#ef4444',
      balloonSpeed: 'MEDIUM',
      options: [{ ...emptyOption(), isCorrect: true }, emptyOption(), emptyOption()],
    };
  }
  return {
    type: q.type === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'SINGLE',
    text: q.text,
    image: q.image || '',
    balloonColor: q.balloonColor || '#ef4444',
    balloonSpeed: q.balloonSpeed || 'MEDIUM',
    options: q.options.map((o) => ({
      text: o.text || '',
      image: o.image || '',
      color: o.color || '',
      isCorrect: !!o.isCorrect,
    })),
  };
}

function BalloonForm({ initial, onSave, onCancel, saving }) {
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
    setQ({ ...q, options: q.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });
  }

  function toggleCorrect(i) {
    setQ({ ...q, options: q.options.map((o, idx) => ({ ...o, isCorrect: idx === i })) });
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
    if (!q.options.some((o) => o.isCorrect)) return setErr('Marca cuál opción es la correcta.');
    return onSave({
      type: q.type,
      text: q.text.trim(),
      image: q.image.trim(),
      balloonColor: q.balloonColor,
      balloonSpeed: q.balloonSpeed,
      options: q.options
        .filter((o) => o.text.trim() || o.image.trim() || q.type === 'TRUE_FALSE')
        .map((o) => ({
          text: o.text.trim(),
          image: o.image.trim(),
          color: o.color.trim(),
          isCorrect: !!o.isCorrect,
        })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Tipo" value={q.type} onChange={(e) => setType(e.target.value)}>
          <option value="SINGLE">Opción única</option>
          <option value="TRUE_FALSE">Verdadero / Falso</option>
        </Select>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Color del globo</span>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(q.balloonColor) ? q.balloonColor : '#ef4444'}
            onChange={(e) => setQ({ ...q, balloonColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded border border-slate-300"
          />
        </label>
        <Select label="Velocidad" value={q.balloonSpeed} onChange={(e) => setQ({ ...q, balloonSpeed: e.target.value })}>
          <option value="SLOW">Lento</option>
          <option value="MEDIUM">Medio</option>
          <option value="FAST">Rápido</option>
        </Select>
      </div>

      <Textarea label="Enunciado" rows={2} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} />
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
          {saving ? 'Guardando…' : 'Guardar globo'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default function BalloonsEditor({ quiz }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // globo id | 'new' | null
  const invalidate = () => qc.invalidateQueries({ queryKey: ['quiz', quiz.id] });

  const addQ = useMutation({
    mutationFn: (body) => api.authPost(`/quizzes/${quiz.id}/questions`, body),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const updateQ = useMutation({
    mutationFn: ({ qid, body }) => api.authPatch(`/questions/${qid}`, body),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const deleteQ = useMutation({ mutationFn: (qid) => api.authDel(`/questions/${qid}`), onSuccess: invalidate });
  const reorder = useMutation({
    mutationFn: (orderedIds) => api.authPost(`/quizzes/${quiz.id}/reorder-questions`, { orderedIds }),
    onSuccess: invalidate,
  });

  function move(index, dir) {
    const ids = quiz.questions.map((q) => q.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorder.mutate(ids);
  }

  const saving = addQ.isPending || updateQ.isPending;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Cada globo es una pregunta con su propio color y velocidad de subida. El juego termina cuando todos los
        globos fueron reventados (respondidos).
      </p>

      {quiz.questions.map((q, i) => (
        <Card key={q.id}>
          {editing === q.id ? (
            <BalloonForm
              initial={q}
              saving={saving}
              onCancel={() => setEditing(null)}
              onSave={(body) => updateQ.mutate({ qid: q.id, body })}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="h-7 w-7 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: q.balloonColor || '#ef4444' }}
                title="Color del globo"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{q.text}</p>
                <p className="text-xs text-slate-500">
                  {q.type === 'TRUE_FALSE' ? 'Verdadero/Falso' : 'Opción única'} · {q.options.length} opciones ·
                  velocidad {SPEED_LABEL[q.balloonSpeed] || 'Medio'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </Button>
                <Button variant="ghost" onClick={() => move(i, 1)} disabled={i === quiz.questions.length - 1}>
                  ↓
                </Button>
                <Button variant="secondary" onClick={() => setEditing(q.id)}>
                  Editar
                </Button>
                <ConfirmButton onConfirm={() => deleteQ.mutate(q.id)} confirmLabel="¿Eliminar?">
                  Eliminar
                </ConfirmButton>
              </div>
            </div>
          )}
        </Card>
      ))}

      {editing === 'new' ? (
        <Card>
          <h3 className="mb-3 font-semibold">Nuevo globo</h3>
          <BalloonForm saving={saving} onCancel={() => setEditing(null)} onSave={(body) => addQ.mutate(body)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing('new')}>+ Añadir globo</Button>
      )}

      {(addQ.isError || updateQ.isError) && (
        <p className="text-sm text-red-600">{(addQ.error || updateQ.error).message}</p>
      )}
    </div>
  );
}
