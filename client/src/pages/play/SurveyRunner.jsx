import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { themeToStyle } from '../../lib/theme.js';

export default function SurveyRunner() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['survey', slug],
    queryFn: () => api.get(`/play/${slug}`),
  });

  const [phase, setPhase] = useState('intro'); // intro | screen | done
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null); // { sessionId, playerId, quiz }
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> { selected:Set, other:string }
  const [result, setResult] = useState(null);

  const quiz = session?.quiz || data?.quiz;
  const helper = useMemo(() => (quiz ? themeToStyle(quiz.theme) : null), [quiz]);

  if (isLoading) return <Centered>Cargando…</Centered>;
  if (isError || !data?.quiz) return <Centered>Esta actividad no está disponible.</Centered>;
  if (data.quiz.type !== 'SURVEY') {
    window.location.replace(`/play/${slug}`);
    return null;
  }

  const askNickname = data.quiz.settings.askNickname !== false;
  const nicknameLabel = data.quiz.settings.nicknameLabel || 'Tu nombre';
  const closed = data.quiz.settings.acceptingResponses === false;
  const showProgress = data.quiz.settings.showProgressBar !== false;

  async function start() {
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/play/${slug}/start`, askNickname ? { nickname: nickname.trim() || undefined } : {});
      setSession(res);
      const init = {};
      res.quiz.questions.forEach((q) => {
        init[q.id] = { selected: new Set(), other: '' };
      });
      setAnswers(init);
      setIndex(0);
      setPhase('screen');
    } catch (err) {
      setError(err.message || 'No se pudo empezar');
    } finally {
      setBusy(false);
    }
  }

  const screens = session?.quiz.questions || [];
  const screen = screens[index];
  const current = screen ? answers[screen.id] : null;

  function toggle(optId) {
    setAnswers((prev) => {
      const a = { ...prev[screen.id], selected: new Set(prev[screen.id].selected) };
      if (screen.type === 'MULTIPLE') {
        a.selected.has(optId) ? a.selected.delete(optId) : a.selected.add(optId);
      } else {
        a.selected = a.selected.has(optId) ? new Set() : new Set([optId]);
      }
      return { ...prev, [screen.id]: a };
    });
  }

  function setOther(text) {
    setAnswers((prev) => ({ ...prev, [screen.id]: { ...prev[screen.id], other: text } }));
  }

  async function next() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/play/sessions/${session.sessionId}/answer`, {
        questionId: screen.id,
        selectedOptionIds: [...current.selected],
        otherText: current.other?.trim() || '',
        timeMs: 0,
      });
      if (index + 1 < screens.length) {
        setIndex(index + 1);
        window.scrollTo(0, 0);
      } else {
        const fin = await api.post(`/play/sessions/${session.sessionId}/finish`);
        setResult(fin);
        setPhase('done');
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar tu respuesta');
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="game-theme min-h-screen" style={helper.style}>
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-6">
        {phase === 'intro' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            {data.quiz.theme?.logo && <img src={data.quiz.theme.logo} alt="" className="max-h-16 object-contain" />}
            {data.quiz.coverImage && (
              <img src={data.quiz.coverImage} alt="" className="max-h-48 rounded-2xl object-contain shadow-xl" />
            )}
            <h1 className="font-extrabold leading-tight" style={{ fontSize: 'calc(1.9rem * var(--heading-scale,1))' }}>
              {data.quiz.title}
            </h1>
            {data.quiz.description && <p className="text-lg opacity-90">{data.quiz.description}</p>}

            {closed ? (
              <p className="rounded-xl bg-white/20 px-4 py-3 text-lg font-semibold">
                Esta actividad está cerrada por ahora.
              </p>
            ) : (
              <>
                {askNickname && (
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={nicknameLabel}
                    maxLength={60}
                    className="w-full rounded-xl border-0 px-4 py-4 text-center text-xl text-slate-900 shadow-lg outline-none"
                  />
                )}
                {error && <p className="text-base font-semibold text-red-100">{error}</p>}
                <BigButton onClick={start} disabled={busy}>
                  {busy ? 'Un momento…' : 'Empezar'}
                </BigButton>
              </>
            )}
          </div>
        )}

        {phase === 'screen' && screen && (
          <div className="flex flex-1 flex-col gap-5">
            {showProgress && (
              <p className="text-center text-base font-bold opacity-90">
                Pregunta {index + 1} de {screens.length}
              </p>
            )}
            <h2 className="text-center font-extrabold leading-snug" style={{ fontSize: 'calc(1.5rem * var(--heading-scale,1))' }}>
              {screen.text}
            </h2>
            {screen.image && (
              <img src={screen.image} alt="" className="mx-auto max-h-44 rounded-xl object-contain shadow-lg" />
            )}
            {screen.type === 'MULTIPLE' && (
              <p className="text-center text-sm opacity-80">Puedes marcar varias.</p>
            )}

            <div className="flex flex-col gap-3">
              {screen.options.map((opt) => {
                const on = current.selected.has(opt.id);
                const c = opt.color || helper.optionColor(0);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className="flex min-h-[60px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-lg font-semibold shadow-sm transition"
                    style={
                      on
                        ? { backgroundColor: c, borderColor: c, color: '#fff' }
                        : { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a' }
                    }
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black"
                      style={on ? { borderColor: '#fff' } : { borderColor: c, color: c }}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span className="min-w-0 break-words">{opt.text}</span>
                  </button>
                );
              })}

              {screen.allowOther && (
                <div className="rounded-2xl border-2 border-dashed border-white/50 bg-white/10 p-3">
                  <label className="mb-1 block text-base font-semibold">Otra respuesta (opcional)</label>
                  <textarea
                    rows={2}
                    value={current.other}
                    onChange={(e) => setOther(e.target.value)}
                    placeholder="Escribe aquí… (puedes usar el micrófono del teclado 🎤)"
                    maxLength={500}
                    className="w-full rounded-xl border-0 px-3 py-2 text-lg text-slate-900 outline-none"
                  />
                </div>
              )}
            </div>

            {error && <p className="text-center text-base font-semibold text-red-100">{error}</p>}
            <BigButton onClick={next} disabled={busy}>
              {busy ? 'Guardando…' : index + 1 < screens.length ? 'Siguiente' : 'Terminar'}
            </BigButton>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="text-6xl">✅</div>
            <h2 className="font-extrabold" style={{ fontSize: 'calc(1.7rem * var(--heading-scale,1))' }}>
              {result?.closingMessage || '¡Listo! Gracias por participar.'}
            </h2>
            {result?.showResults && result.screens && (
              <div className="w-full space-y-5 text-left">
                {result.screens.map((s) => (
                  <ResultBars key={s.questionId} screen={s} respondents={result.respondents} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BigButton({ children, ...props }) {
  return (
    <button
      className="w-full rounded-2xl px-6 py-4 text-xl font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
      style={{ backgroundColor: 'var(--primary)' }}
      {...props}
    >
      {children}
    </button>
  );
}

function ResultBars({ screen, respondents }) {
  const max = Math.max(1, ...screen.options.map((o) => o.count));
  return (
    <div className="rounded-xl bg-white/15 p-3">
      <p className="mb-2 font-bold">{screen.text}</p>
      <div className="space-y-1.5">
        {screen.options.map((o) => (
          <div key={o.id}>
            <div className="flex justify-between text-sm">
              <span>{o.text}</span>
              <span className="font-bold">{o.count}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded bg-white/25">
              <div
                className="h-full rounded"
                style={{ width: `${(o.count / max) * 100}%`, backgroundColor: o.color || '#22c55e' }}
              />
            </div>
          </div>
        ))}
      </div>
      {respondents != null && <p className="mt-2 text-xs opacity-80">{respondents} participante(s)</p>}
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-lg text-slate-200">
      {children}
    </div>
  );
}
