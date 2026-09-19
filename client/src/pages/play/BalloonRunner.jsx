import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { themeToStyle } from '../../lib/theme.js';
import { playStart, playPopSound, playCorrect, playIncorrect, playWinSound } from '../../lib/sound.js';
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
  const [mistakes, setMistakes] = useState(0);
  const [burst, setBurst] = useState(null); // { x, y, color } explosión al reventar

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
        left: Math.min(90, Math.max(10, laneWidth * i + laneWidth / 2 + jitter)),
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
      setMistakes(0);
      setPhase('play');
      playStart(res.quiz.settings?.sounds?.start);
    } catch (err) {
      setError(err.message || 'No se pudo empezar');
    } finally {
      setBusy(false);
    }
  }

  function popBalloon(e, q) {
    if (active || burst) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, color: q.balloonColor || '#ef4444' });
    playPopSound(quiz.settings?.sounds?.pop);
    setTimeout(() => setBurst(null), 500);
    setTimeout(() => setActive(q), 180);
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
      if (res.isCorrect) {
        playCorrect(quiz.settings?.sounds?.correct);
      } else {
        setMistakes((m) => m + 1);
        playIncorrect(quiz.settings?.sounds?.incorrect);
      }
      setFeedback({ isCorrect: res.isCorrect, correctOptionIds: res.correctOptionIds || [] });
    } catch (err) {
      setError(err.message || 'No se pudo enviar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  async function continueAfterAnswer() {
    const wasCorrect = feedback?.isCorrect;
    const finishedId = active.id;
    setActive(null);
    setFeedback(null);
    if (!wasCorrect) return; // el globo sigue disponible: hay que reintentarlo

    const nextAnswered = new Set(answeredIds);
    nextAnswered.add(finishedId);
    setAnsweredIds(nextAnswered);

    if (nextAnswered.size >= session.quiz.questions.length) {
      setBusy(true);
      try {
        await api.post(`/play/sessions/${session.sessionId}/finish`);
        setPhase('done');
        playWinSound(quiz.settings?.sounds?.win);
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
      <div
        className={`relative z-10 mx-auto flex min-h-screen w-full flex-col px-4 py-6 ${
          phase === 'play' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
      >
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
                      onClick={(e) => popBalloon(e, q)}
                      className="balloon"
                      style={{
                        left: `${l.left}%`,
                        translate: '-50% 0',
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
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ConfettiLayer />
            <WinFireworks />
            <div className="text-6xl">🎉</div>
            <h2 className="font-extrabold" style={{ fontSize: 'calc(2rem * var(--heading-scale,1))' }}>
              ¡Ganaste!
            </h2>
            <p className="text-lg opacity-90">{data.quiz.settings.closingMessage || '¡Reventaste todos los globos!'}</p>
            <p className="text-base font-semibold opacity-80">
              {mistakes === 0 ? '🌟 ¡Sin errores, todos a la primera!' : `Lo lograste con ${mistakes} intento(s) extra.`}
            </p>
          </div>
        )}
      </div>

      {burst && <Burst x={burst.x} y={burst.y} color={burst.color} />}

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
                {!feedback.isCorrect && <p className="text-sm opacity-70">El globo vuelve a subir, ¡inténtalo de nuevo!</p>}
                <button
                  onClick={continueAfterAnswer}
                  disabled={busy}
                  className="rounded-xl px-8 py-3 text-lg font-extrabold text-white shadow-lg hover:brightness-110 disabled:opacity-60"
                  style={{ backgroundColor: feedback.isCorrect ? 'var(--primary)' : '#dc2626' }}
                >
                  {feedback.isCorrect ? 'Continuar' : 'Intentar de nuevo'}
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

const BURST_PIECES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 34 + seededRandom(`burst:${i}`) * 26;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
});

function Burst({ x, y, color }) {
  return (
    <div className="pointer-events-none fixed z-[60]" style={{ left: x, top: y }}>
      {BURST_PIECES.map((p, i) => (
        <span
          key={i}
          className="pop-shard"
          style={{ backgroundColor: color, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` }}
        />
      ))}
    </div>
  );
}

function WinFireworks() {
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const points = [
      { x: w * 0.22, y: h * 0.3, color: '#ef4444' },
      { x: w * 0.78, y: h * 0.25, color: '#2563eb' },
      { x: w * 0.5, y: h * 0.45, color: '#f59e0b' },
      { x: w * 0.35, y: h * 0.6, color: '#a855f7' },
    ];
    const timers = points.map((p, i) => setTimeout(() => setBursts((b) => [...b, { ...p, id: i }]), i * 380));
    return () => timers.forEach(clearTimeout);
  }, []);

  return bursts.map((b) => <Burst key={b.id} x={b.x} y={b.y} color={b.color} />);
}

const CONFETTI_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#2563eb', '#a855f7', '#ec4899'];
const CONFETTI_PIECES = Array.from({ length: 50 }, (_, i) => ({
  left: seededRandom(`confetti:${i}:l`) * 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  duration: 2.4 + seededRandom(`confetti:${i}:d`) * 2,
  delay: -seededRandom(`confetti:${i}:o`) * 4,
}));

function ConfettiLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {CONFETTI_PIECES.map((c, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${c.left}%`,
            backgroundColor: c.color,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
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
