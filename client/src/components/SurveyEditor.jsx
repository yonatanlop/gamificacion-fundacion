import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Button, Card, Select, Textarea, Toggle, ConfirmButton } from './ui.jsx';
import ImageInput from './ImageInput.jsx';

const PALETTE = ['#e11d48', '#f97316', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#c026d3'];

function emptyOption(i = 0) {
  return { text: '', color: PALETTE[i % PALETTE.length], image: '' };
}

function normalize(screen) {
  if (!screen) {
    return { text: '', image: '', type: 'SINGLE', allowOther: false, options: [emptyOption(0), emptyOption(1), emptyOption(2)] };
  }
  return {
    text: screen.text,
    image: screen.image || '',
    type: screen.type === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE',
    allowOther: !!screen.allowOther,
    options: screen.options.map((o, i) => ({
      text: o.text || '',
      color: o.color || PALETTE[i % PALETTE.length],
      image: o.image || '',
    })),
  };
}

function ScreenForm({ initial, onSave, onCancel, saving }) {
  const [s, setS] = useState(() => normalize(initial));
  const [err, setErr] = useState('');

  const setOpt = (i, patch) => setS({ ...s, options: s.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });

  function submit() {
    setErr('');
    if (!s.text.trim()) return setErr('Escribe la pregunta.');
    const opts = s.options.filter((o) => o.text.trim());
    if (opts.length < 1) return setErr('Agrega al menos una opción con texto.');
    return onSave({
      type: s.type,
      text: s.text.trim(),
      image: s.image.trim(),
      allowOther: s.allowOther,
      options: opts.map((o) => ({ text: o.text.trim(), color: o.color || '', image: o.image || '' })),
    });
  }

  return (
    <div className="space-y-4">
      <Textarea label="Pregunta" rows={2} value={s.text} onChange={(e) => setS({ ...s, text: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="¿Cómo responden?" value={s.type} onChange={(e) => setS({ ...s, type: e.target.value })}>
          <option value="SINGLE">Elegir una opción</option>
          <option value="MULTIPLE">Elegir varias opciones</option>
        </Select>
        <div className="flex items-end">
          <Toggle
            label='Permitir "Otra respuesta" (texto libre)'
            checked={s.allowOther}
            onChange={(v) => setS({ ...s, allowOther: v })}
          />
        </div>
      </div>
      <ImageInput label="Imagen (opcional)" value={s.image} onChange={(v) => setS({ ...s, image: v })} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Opciones</span>
          <Button variant="ghost" onClick={() => setS({ ...s, options: [...s.options, emptyOption(s.options.length)] })} disabled={s.options.length >= 8}>
            + Opción
          </Button>
        </div>
        <div className="space-y-2">
          {s.options.map((o, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
              <input
                type="text"
                placeholder={`Opción ${i + 1}`}
                value={o.text}
                onChange={(e) => setOpt(i, { text: e.target.value })}
                className="min-w-[8rem] flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="color"
                title="Color de la opción"
                value={/^#[0-9a-fA-F]{6}$/.test(o.color) ? o.color : '#2563eb'}
                onChange={(e) => setOpt(i, { color: e.target.value })}
                className="h-8 w-9 cursor-pointer rounded border border-slate-300"
              />
              <div className="w-full sm:w-64">
                <ImageInput label="" compact value={o.image} onChange={(v) => setOpt(i, { image: v })} />
              </div>
              {s.options.length > 1 && (
                <Button variant="ghost" onClick={() => setS({ ...s, options: s.options.filter((_, idx) => idx !== i) })}>
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
          {saving ? 'Guardando…' : 'Guardar pantalla'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default function SurveyEditor({ quiz }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // screen id | 'new' | null
  const invalidate = () => qc.invalidateQueries({ queryKey: ['quiz', quiz.id] });

  const add = useMutation({
    mutationFn: (body) => api.authPost(`/quizzes/${quiz.id}/questions`, body),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const update = useMutation({
    mutationFn: ({ qid, body }) => api.authPatch(`/questions/${qid}`, body),
    onSuccess: () => { invalidate(); setEditing(null); },
  });
  const remove = useMutation({ mutationFn: (qid) => api.authDel(`/questions/${qid}`), onSuccess: invalidate });
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

  const saving = add.isPending || update.isPending;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Cada pantalla es una pregunta con opciones para tocar. Sin puntaje ni tiempo.
      </p>

      {quiz.questions.map((q, i) => (
        <Card key={q.id}>
          {editing === q.id ? (
            <ScreenForm initial={q} saving={saving} onCancel={() => setEditing(null)} onSave={(body) => update.mutate({ qid: q.id, body })} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{q.text}</p>
                <p className="text-xs text-slate-500">
                  {q.type === 'MULTIPLE' ? 'Elegir varias' : 'Elegir una'} · {q.options.length} opciones
                  {q.allowOther ? ' · con "Otra"' : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
                <Button variant="ghost" onClick={() => move(i, 1)} disabled={i === quiz.questions.length - 1}>↓</Button>
                <Button variant="secondary" onClick={() => setEditing(q.id)}>Editar</Button>
                <ConfirmButton onConfirm={() => remove.mutate(q.id)} confirmLabel="¿Eliminar?">Eliminar</ConfirmButton>
              </div>
            </div>
          )}
        </Card>
      ))}

      {editing === 'new' ? (
        <Card>
          <h3 className="mb-3 font-semibold">Nueva pantalla</h3>
          <ScreenForm saving={saving} onCancel={() => setEditing(null)} onSave={(body) => add.mutate(body)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing('new')}>+ Añadir pantalla</Button>
      )}

      {(add.isError || update.isError) && (
        <p className="text-sm text-red-600">{(add.error || update.error).message}</p>
      )}
    </div>
  );
}
