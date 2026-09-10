import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Button, Card, Input, Textarea, Toggle, Spinner, ConfirmButton } from '../../components/ui.jsx';
import ImageInput from '../../components/ImageInput.jsx';
import ThemeEditor from '../../components/ThemeEditor.jsx';
import GamePreview from '../../components/GamePreview.jsx';
import QuestionForm from '../../components/QuestionForm.jsx';
import SurveyEditor from '../../components/SurveyEditor.jsx';
import ShareBox from '../../components/ShareBox.jsx';

export default function QuizEditorPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('contenido');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => api.authGet(`/quizzes/${id}`),
  });
  const quiz = data?.quiz;

  const patch = useMutation({
    mutationFn: (body) => api.authPatch(`/quizzes/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quiz', id] }),
  });

  const publish = useMutation({
    mutationFn: (action) => api.authPost(`/quizzes/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quiz', id] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  if (isLoading) return <Spinner />;
  if (isError) return <p className="text-red-600">{error.message}</p>;

  const isSurvey = quiz.type === 'SURVEY';
  const publicPath = isSurvey ? `/s/${quiz.slug}` : `/play/${quiz.slug}`;
  const playLink = `${window.location.origin}${publicPath}`;
  const TABS = [
    ['contenido', isSurvey ? 'Pantallas' : 'Contenido'],
    ['diseno', 'Diseño'],
    ['ajustes', 'Ajustes'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin" className="text-sm text-slate-500 hover:text-indigo-700">
          ← Volver
        </Link>
        <h1 className="font-display text-xl font-bold">{quiz.title}</h1>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {isSurvey ? 'Sondeo' : 'Quiz'}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            quiz.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {quiz.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {quiz.status === 'PUBLISHED' ? (
            <>
              <a href={playLink} target="_blank" rel="noreferrer">
                <Button variant="secondary">Abrir ↗</Button>
              </a>
              {isSurvey && (
                <a href={`/admin/quizzes/${id}/presentar`} target="_blank" rel="noreferrer">
                  <Button>Proyectar ▶</Button>
                </a>
              )}
              <Button variant="ghost" onClick={() => publish.mutate('unpublish')}>
                Despublicar
              </Button>
            </>
          ) : (
            <Button
              onClick={() => publish.mutate('publish')}
              disabled={quiz.questions.length === 0 || publish.isPending}
            >
              Publicar
            </Button>
          )}
        </div>
      </div>
      {publish.isError && <p className="text-sm text-red-600">{publish.error.message}</p>}

      {quiz.status === 'PUBLISHED' && <ShareBox path={publicPath} />}

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'contenido' && (isSurvey ? <SurveyEditor quiz={quiz} /> : <ContentTab quiz={quiz} />)}
      {tab === 'diseno' && <DesignTab quiz={quiz} onSave={(theme) => patch.mutate({ theme })} saving={patch.isPending} />}
      {tab === 'ajustes' && (
        <SettingsTab
          quiz={quiz}
          isSurvey={isSurvey}
          onSave={(body) => patch.mutate(body)}
          saving={patch.isPending}
          error={patch.isError ? patch.error.message : ''}
        />
      )}
    </div>
  );
}

/* ------------------------------- Contenido ------------------------------- */
function ContentTab({ quiz }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // question id | 'new' | null

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
  const deleteQ = useMutation({
    mutationFn: (qid) => api.authDel(`/questions/${qid}`),
    onSuccess: invalidate,
  });
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
      {quiz.questions.map((q, i) => (
        <Card key={q.id}>
          {editing === q.id ? (
            <QuestionForm
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
                <p className="text-xs text-slate-500">
                  {q.type} · {q.timeLimit}s · {q.options.length} opciones ·{' '}
                  {q.options.filter((o) => o.isCorrect).length} correcta(s)
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
          <QuestionForm saving={saving} onCancel={() => setEditing(null)} onSave={(body) => addQ.mutate(body)} />
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

/* -------------------------------- Diseño -------------------------------- */
function DesignTab({ quiz, onSave, saving }) {
  const [theme, setTheme] = useState(quiz.theme);
  useEffect(() => setTheme(quiz.theme), [quiz.theme]);

  const sampleQuestion = useMemo(() => {
    const q = quiz.questions[0];
    if (!q) return null;
    return { text: q.text, image: q.image, options: q.options };
  }, [quiz.questions]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Button onClick={() => onSave(theme)} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar diseño'}
          </Button>
          <Button variant="ghost" onClick={() => setTheme(quiz.theme)}>
            Descartar cambios
          </Button>
        </div>
        <ThemeEditor value={theme} onChange={setTheme} />
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-sm font-semibold text-slate-600">Vista previa</p>
        <GamePreview theme={theme} question={sampleQuestion} />
      </div>
    </div>
  );
}

/* -------------------------------- Ajustes ------------------------------- */
function SettingsTab({ quiz, isSurvey, onSave, saving, error }) {
  const [form, setForm] = useState({
    title: quiz.title,
    description: quiz.description || '',
    slug: quiz.slug,
    coverImage: quiz.coverImage || '',
    settings: { ...quiz.settings },
  });
  useEffect(() => {
    setForm({
      title: quiz.title,
      description: quiz.description || '',
      slug: quiz.slug,
      coverImage: quiz.coverImage || '',
      settings: { ...quiz.settings },
    });
  }, [quiz]);

  const s = form.settings;
  const setS = (key, v) => setForm({ ...form, settings: { ...s, [key]: v } });

  return (
    <Card className="max-w-2xl space-y-4">
      <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Textarea
        label="Descripción"
        rows={2}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <Input
        label="Slug del link público"
        value={form.slug}
        onChange={(e) => setForm({ ...form, slug: e.target.value })}
      />
      <ImageInput
        label="Imagen de portada"
        value={form.coverImage}
        onChange={(v) => setForm({ ...form, coverImage: v })}
      />

      {isSurvey ? (
        <>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">Participación</p>
            <Toggle label="Pedir el nombre del participante" checked={s.askNickname !== false} onChange={(v) => setS('askNickname', v)} />
            <Toggle
              label="Sondeo abierto (acepta respuestas)"
              checked={s.acceptingResponses !== false}
              onChange={(v) => setS('acceptingResponses', v)}
            />
            <Toggle label="Barajar el orden de las opciones" checked={!!s.shuffleAnswers} onChange={(v) => setS('shuffleAnswers', v)} />
          </div>
          <Input
            label="Etiqueta del campo de nombre"
            value={s.nicknameLabel || 'Tu nombre'}
            onChange={(e) => setS('nicknameLabel', e.target.value)}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">¿Quién ve los resultados?</span>
            <select
              value={s.resultsVisibility || 'admin'}
              onChange={(e) => setS('resultsVisibility', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="admin">Solo el docente (recomendado)</option>
              <option value="end">Los participantes al terminar</option>
              <option value="never">Nadie</option>
            </select>
          </label>
          <Textarea
            label="Mensaje al terminar"
            rows={2}
            value={s.closingMessage || ''}
            onChange={(e) => setS('closingMessage', e.target.value)}
          />
        </>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">Comportamiento del juego</p>
            <Toggle label="Pedir apodo al jugador" checked={s.askNickname !== false} onChange={(v) => setS('askNickname', v)} />
            <Toggle
              label="Mostrar respuestas correctas al final"
              checked={s.showCorrectAtEnd !== false}
              onChange={(v) => setS('showCorrectAtEnd', v)}
            />
            <Toggle label="Barajar preguntas" checked={!!s.shuffleQuestions} onChange={(v) => setS('shuffleQuestions', v)} />
            <Toggle label="Barajar respuestas" checked={!!s.shuffleAnswers} onChange={(v) => setS('shuffleAnswers', v)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Tiempo por defecto (s)"
              type="number"
              value={s.defaultTimeLimit ?? 30}
              onChange={(e) => setS('defaultTimeLimit', Number(e.target.value))}
            />
            <Input
              label="Puntos por defecto"
              type="number"
              value={s.defaultPoints ?? 1000}
              onChange={(e) => setS('defaultPoints', Number(e.target.value))}
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={() => onSave(form)} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar ajustes'}
      </Button>
    </Card>
  );
}
