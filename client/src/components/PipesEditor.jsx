import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Button, Card, Select, Textarea, ColorField, ConfirmButton } from './ui.jsx';
import ImageInput from './ImageInput.jsx';

const PIPE_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

function emptyOption(i) {
  return { text: '', image: '', color: PIPE_COLORS[i % PIPE_COLORS.length], isCorrect: false };
}

function normalize(q) {
  if (!q) {
    return {
      type: 'SINGLE',
      text: '',
      image: '',
      options: [{ ...emptyOption(0), isCorrect: true }, emptyOption(1), emptyOption(2)],
    };
  }
  return {
    type: q.type === 'TRUE_FALSE' ? 'TRUE_FALSE' : 'SINGLE',
    text: q.text,
    image: q.image || '',
    options: q.options.map((o, i) => ({
      text: o.text || '',
      image: o.image || '',
      color: o.color || PIPE_COLORS[i % PIPE_COLORS.length],
      isCorrect: !!o.isCorrect,
    })),
  };
}

function PipeForm({ initial, onSave, onCancel, saving }) {
  const [q, setQ] = useState(() => normalize(initial));
  const [err, setErr] = useState('');

  function setType(type) {
    if (type === 'TRUE_FALSE') {
      setQ({
        ...q,
        type,
        options: [
          { ...emptyOption(0), text: 'Verdadero', isCorrect: true },
          { ...emptyOption(1), text: 'Falso', isCorrect: false },
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
    if (q.options.length >= 4) return;
    setQ({ ...q, options: [...q.options, emptyOption(q.options.length)] });
  }

  function removeOption(i) {
    if (q.options.length <= 2) return;
    setQ({ ...q, options: q.options.filter((_, idx) => idx !== i) });
  }

  function submit() {
    setErr('');
    if (!q.text.trim()) return setErr('Escribe el enunciado de la pregunta.');
    const filled = q.options.filter((o) => o.text.trim());
    if (filled.length < 2) return setErr('Necesitas al menos 2 tubos con texto.');
    if (!q.options.some((o) => o.isCorrect)) return setErr('Marca cuál tubo es el correcto.');
    return onSave({
      type: q.type,
      text: q.text.trim(),
      image: q.image.trim(),
      options: q.options
        .filter((o) => o.text.trim() || q.type === 'TRUE_FALSE')
        .map((o) => ({
          text: o.text.trim(),
          color: o.color,
          isCorrect: !!o.isCorrect,
        })),
    });
  }

  return (
    <div className="space-y-4">
      <Select label="Tipo" value={q.type} onChange={(e) => setType(e.target.value)}>
        <option value="SINGLE">Opción única</option>
        <option value="TRUE_FALSE">Verdadero / Falso</option>
      </Select>

      <Textarea label="Enunciado" rows={2} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} />
      <ImageInput label="Imagen de la pregunta (opcional)" value={q.image} onChange={(v) => setQ({ ...q, image: v })} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Tubos (opciones de respuesta)</span>
          {q.type !== 'TRUE_FALSE' && (
            <Button variant="ghost" onClick={addOption} disabled={q.options.length >= 4}>
              + Tubo
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {q.options.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
              <button
                type="button"
                onClick={() => toggleCorrect(i)}
                title="Marcar como correcto"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  o.isCorrect ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 text-slate-400'
                }`}
              >
                ✓
              </button>
              <input
                type="text"
                placeholder={`Tubo ${i + 1}`}
                value={o.text}
                disabled={q.type === 'TRUE_FALSE'}
                onChange={(e) => setOption(i, { text: e.target.value })}
                className="min-w-[8rem] flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
              <ColorField label="Color" value={o.color} onChange={(v) => setOption(i, { color: v })} />
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

export default function PipesEditor({ quiz }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // pregunta id | 'new' | null
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
        Cada pregunta tiene 2 a 4 tubos de colores; el jugador elige uno para responder. Si se equivoca, puede
        volver a intentarlo. El orden de las preguntas también define desde cuál se activa el límite de tiempo y
        dónde aparecen los mensajes narrativos (ver Ajustes).
      </p>

      {quiz.questions.map((q, i) => (
        <Card key={q.id}>
          {editing === q.id ? (
            <PipeForm
              initial={q}
              saving={saving}
              onCancel={() => setEditing(null)}
              onSave={(body) => updateQ.mutate({ qid: q.id, body })}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="shrink-0 text-xs font-semibold text-slate-400">#{i + 1}</span>
              <div className="flex shrink-0 gap-1">
                {q.options.map((o, oi) => (
                  <span
                    key={oi}
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: o.color || '#22c55e' }}
                    title={o.text}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{q.text}</p>
                <p className="text-xs text-slate-500">
                  {q.type === 'TRUE_FALSE' ? 'Verdadero/Falso' : 'Opción única'} · {q.options.length} tubos
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
          <h3 className="mb-3 font-semibold">Nueva pregunta</h3>
          <PipeForm saving={saving} onCancel={() => setEditing(null)} onSave={(body) => addQ.mutate(body)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing('new')}>+ Añadir pregunta</Button>
      )}

      {(addQ.isError || updateQ.isError) && (
        <p className="text-sm text-red-600">{(addQ.error || updateQ.error).message}</p>
      )}
    </div>
  );
}
