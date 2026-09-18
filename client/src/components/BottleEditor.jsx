import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Button, Card, Textarea, ConfirmButton } from './ui.jsx';
import ImageInput from './ImageInput.jsx';

function normalize(q) {
  if (!q) return { text: '', image: '', answerText: '' };
  return { text: q.text, image: q.image || '', answerText: q.answerText || '' };
}

function BottleForm({ initial, onSave, onCancel, saving }) {
  const [q, setQ] = useState(() => normalize(initial));
  const [err, setErr] = useState('');

  function submit() {
    setErr('');
    if (!q.text.trim()) return setErr('Escribe la pregunta.');
    if (!q.answerText.trim()) return setErr('Escribe la respuesta que se revelará.');
    return onSave({ text: q.text.trim(), image: q.image.trim(), answerText: q.answerText.trim() });
  }

  return (
    <div className="space-y-4">
      <Textarea label="Pregunta" rows={2} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} />
      <ImageInput label="Imagen (opcional)" value={q.image} onChange={(v) => setQ({ ...q, image: v })} />
      <Textarea
        label="Respuesta (se revela al presentar)"
        rows={3}
        value={q.answerText}
        onChange={(e) => setQ({ ...q, answerText: e.target.value })}
      />

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

export default function BottleEditor({ quiz }) {
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
        Cada pregunta ocupa un espacio de la ruleta. Al presentar, el profesor gira, ve la pregunta y revela la
        respuesta con un clic — sin opciones ni puntaje.
      </p>

      {quiz.questions.map((q, i) => (
        <Card key={q.id}>
          {editing === q.id ? (
            <BottleForm
              initial={q}
              saving={saving}
              onCancel={() => setEditing(null)}
              onSave={(body) => updateQ.mutate({ qid: q.id, body })}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{q.text}</p>
                <p className="truncate text-xs text-slate-500">Respuesta: {q.answerText}</p>
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
          <BottleForm saving={saving} onCancel={() => setEditing(null)} onSave={(body) => addQ.mutate(body)} />
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
