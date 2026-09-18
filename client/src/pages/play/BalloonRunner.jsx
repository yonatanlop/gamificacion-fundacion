import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { themeToStyle } from '../../lib/theme.js';
import AnswerGrid from '../../components/AnswerGrid.jsx';

const SPEED_SECONDS = { SLOW: 12, MEDIUM: 7, FAST: 4 };

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function seededRandom(s) {
  return (hashStr(s) % 1000) / 1000;
}

export default function BalloonRunner() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['balloons', slug],
    queryFn: () => api.get(`/play/${slug}`),
  });

  const [phase, setPhase] = useState('intro'); // intro | play | done
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null); // { sessionId, playerId, quiz }
  const [answeredIds, setAnsweredIds] = useState(() => new Set());
  const [active, setActive] = useState(null); // pregunta abierta en el overlay
  const [feedback, setFeedback] = useState(null); // { isCorrect, correctOptionIds }
  const [result, setResult] = useState(null);

  const quiz = session?.quiz || data?.quiz;
  const helper = useMemo(() => (quiz ? themeToStyle(quiz.theme) : null), [quiz]);

  const layout = useMemo(() => {
    if (!session) return [];
    const total = session.quiz.questions.length;
    return session.quiz.questions.map((q, i) => {
      const laneWidth = 100 / total;
      const jitter = (seededRandom(`${q.id}:x`) - 0.5) * laneWidth * 0.6;
      const duration = SPEED_SECONDS[q.balloonSpeed] || SPEED_SECONDS.MEDIUM;
      return {
        id: q.id,
        left: Math.min(94, Math.max(2, laneWidth * i + laneWidth / 2 + jitter)),
        duration,
        delay: -seededRandom(`${q.id}:d`) * duration,
      };
    });
  }, [session]);

  if (isLoading) return <Centered>Cargando…</Centered>;
  if (isError || !data?.quiz) return <Centered>Esta actividad no está disponible.</Centered>;
  if (data.quiz.type !== 'BALLOONS') {
    window.location.replace(`/play/${slug}`);
    return null;
  }

  const askNickname = data.quiz.settings.askNickname !== false;
  const nicknameLabel = data.quiz.settings.nicknameLabel || 'Tu nombre';

  async function start() {
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/play/${slug}/start`, askNickname ? { nickname: nickname.trim() || undefined } : {});
      setSession(res);
      setAnsweredIds(new Set());
      setPhase('play');
    } catch (err) {
      setError(err.message || 'No se pudo empezar');
    } finally {
      setBusy(false);
    }
  }

  async function pick(optionId) {
    if (!active || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/play/sessions/${session.sessionId}/answer`, {
        questionId: active.id,
        selectedOptionIds: [optionId],
        timeMs: 0,
      });
      setFeedback({ isCorrect: res.isCorrect, correctOptionIds: res.correctOptionIds || [] });
    } catch (err) {
      setError(err.message || 'No se pudo enviar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  async function continueAfterAnswer() {
    const nextAnswered = new Set(answeredIds);
    nextAnswered.add(active.id);
    setAnsweredIds(nextAnswered);
    setActive(null);
    setFeedback(null);

    if (nextAnswered.size >= session.quiz.questions.length) {
      setBusy(true);
      try {
        const fin = await api.post(`/play/sessions/${session.sessionId}/finish`);
        setResult(fin);
        setPhase('done');
      } catch (err) {
        setError(err.message || 'No se pudo cerrar el juego');
      } finally {
        setBusy(false);
      }
    }
  }

  const remaining = session ? session.quiz.questions.filter((q) => !answeredIds.has(q.id)) : [];
  const skyStyle = { ...helper.style, background: undefined, color: '#0f3157' };

  return (
    <div className="game-theme balloon-sky relative min-h-screen overflow-hidden" style={skyStyle}>
      <CloudLayer />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6">
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
            <p className="text-sm opacity-80">{data.quiz.questionCount} globo(s) por reventar</p>

            {askNickname && (
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={nicknameLabel}
                maxLength={60}
                className="w-full rounded-xl border-0 px-4 py-4 text-center text-xl text-slate-900 shadow-lg outline-none"
              />
            )}
            {error && <p className="text-base font-semibold text-red-700">{error}</p>}
            <BigButton onClick={start} disabled={busy}>
              {busy ? 'Preparando…' : 'Empezar'}
            </BigButton>
          </div>
        )}

        {phase === 'play' && session && (
          <div className="relative flex flex-1 flex-col">
            <p className="mb-2 text-center text-base font-bold opacity-90">
              Globos por reventar: {remaining.length} / {session.quiz.questions.length}
            </p>
            <div className="relative flex-1 overflow-hidden rounded-2xl">
              {layout
                .filter((l) => !answeredIds.has(l.id))
                .map((l) => {
                  const q = session.quiz.questions.find((x) => x.id === l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      aria-label={`Reventar globo: ${q.text}`}
                      onClick={() => setActive(q)}
                      className="balloon"
                      style={{
                        left: `${l.left}%`,
                        '--balloon-color': q.balloonColor || '#ef4444',
                        '--rise-duration': `${l.duration}s`,
                        animationDelay: `${l.delay}s`,
                      }}
                    />
                  );
                })}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-6xl">🎈</div>
            <h2 className="font-extrabold" style={{ fontSize: 'calc(1.7rem * var(--heading-scale,1))' }}>
              {data.quiz.settings.closingMessage || '¡Reventaste todos los globos!'}
            </h2>
            {result && (
              <p className="text-lg opacity-90">
                Aciertos: {result.correctCount} / {result.total}
              </p>
            )}
          </div>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--card)', color: 'var(--card-text)' }}>
            <h2 className="mb-4 text-xl font-extrabold">{active.text}</h2>
            {active.image && (
              <img src={active.image} alt="" className="mx-auto mb-4 max-h-40 rounded-xl object-contain" />
            )}
            {!feedback ? (
              <AnswerGrid
                options={active.options}
                helper={helper}
                selected={[]}
                correctIds={null}
                disabled={busy}
                layout="list"
                onPick={pick}
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-2xl font-extrabold" style={{ color: feedback.isCorrect ? '#16a34a' : '#dc2626' }}>
                  {feedback.isCorrect ? '¡Correcto!' : 'Incorrecto'}
                </p>
                <button
                  onClick={continueAfterAnswer}
                  disabled={busy}
                  className="rounded-xl px-8 py-3 text-lg font-extrabold text-white shadow-lg hover:brightness-110 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Continuar
                </button>
              </div>
            )}
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const CLOUDS = [
  { top: '6%', left: '8%', width: 180, duration: 46 },
  { top: '16%', left: '62%', width: 120, duration: 38 },
  { top: '32%', left: '28%', width: 220, duration: 55 },
  { top: '48%', left: '78%', width: 95, duration: 34 },
  { top: '62%', left: '4%', width: 150, duration: 50 },
  { top: '78%', left: '52%', width: 110, duration: 42 },
];

function CloudLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: c.top,
            left: c.left,
            width: `${c.width}px`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${-i * 7}s`,
          }}
        />
      ))}
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

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-lg text-slate-200">
      {children}
    </div>
  );
}
