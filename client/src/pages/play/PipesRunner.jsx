import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { themeToStyle } from '../../lib/theme.js';
import { isWebglAvailable } from '../../lib/webgl.js';
import { ConfettiLayer, WinFireworks } from '../../lib/celebration.jsx';

const PipesScene3D = lazy(() => import('../../components/pipes3d/PipesScene3D.jsx'));

export default function PipesRunner() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pipes', slug],
    queryFn: () => api.get(`/play/${slug}`),
  });

  const [phase, setPhase] = useState('intro'); // intro | story | play | done
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState(null); // { isCorrect, message? }
  const [explorerPhase, setExplorerPhase] = useState('idle');
  const [targetX, setTargetX] = useState(null);
  const [oxygenMs, setOxygenMs] = useState(null); // null = sin cronómetro

  const quiz = session?.quiz || data?.quiz;
  const helper = useMemo(() => (quiz ? themeToStyle(quiz.theme) : null), [quiz]);
  const webglOk = useMemo(() => isWebglAvailable(), []);
  const settings = quiz?.settings || {};
  const storyBeats = settings.storyBeats || [];
  const questions = session?.quiz.questions || [];
  const currentQuestion = questions[currentIndex];
  const oxygenTotalMs = (settings.oxygenSeconds || 20) * 1000;

  const beatFor = (index) => storyBeats.find((b) => b.beforeIndex === index);
  const isTimedAt = (index) => typeof settings.timedFromIndex === 'number' && settings.timedFromIndex >= 0 && index >= settings.timedFromIndex;

  // Cuenta regresiva de oxígeno: puro estado/JS, sin depender de transiciones CSS.
  useEffect(() => {
    if (phase !== 'play' || oxygenMs == null || feedback) return;
    if (oxygenMs <= 0) {
      handleOxygenOut();
      return;
    }
    const t = setTimeout(() => setOxygenMs((ms) => (ms == null ? ms : Math.max(0, ms - 100))), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, oxygenMs, feedback]);

  if (isLoading) return <Centered>Cargando…</Centered>;
  if (isError || !data?.quiz) return <Centered>Esta actividad no está disponible.</Centered>;
  if (data.quiz.type !== 'PIPES') {
    window.location.replace(`/play/${slug}`);
    return null;
  }

  const askNickname = data.quiz.settings.askNickname !== false;
  const nicknameLabel = data.quiz.settings.nicknameLabel || 'Tu nombre';

  function enterPlayPhase(index) {
    setPhase('play');
    setFeedback(null);
    setExplorerPhase('idle');
    setTargetX(null);
    setOxygenMs(isTimedAt(index) ? oxygenTotalMs : null);
  }

  function goToIndex(index) {
    setCurrentIndex(index);
    const beat = beatFor(index);
    if (beat) setPhase('story');
    else enterPlayPhase(index);
  }

  async function start() {
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/play/${slug}/start`, askNickname ? { nickname: nickname.trim() || undefined } : {});
      setSession(res);
      setMistakes(0);
      goToIndex(0);
    } catch (err) {
      setError(err.message || 'No se pudo empezar');
    } finally {
      setBusy(false);
    }
  }

  async function pick(optionId, x) {
    if (busy || feedback || !currentQuestion) return;
    setBusy(true);
    setError('');
    setTargetX(x);
    setExplorerPhase('walking');
    try {
      const res = await api.post(`/play/sessions/${session.sessionId}/answer`, {
        questionId: currentQuestion.id,
        selectedOptionIds: [optionId],
        timeMs: 0,
      });
      if (res.isCorrect) {
        setExplorerPhase('correct');
      } else {
        setMistakes((m) => m + 1);
        setExplorerPhase('wrong');
      }
      setFeedback({ isCorrect: res.isCorrect });
    } catch (err) {
      setError(err.message || 'No se pudo enviar la respuesta');
      setExplorerPhase('idle');
      setTargetX(null);
    } finally {
      setBusy(false);
    }
  }

  function handleOxygenOut() {
    if (busy || feedback) return;
    setMistakes((m) => m + 1);
    setTargetX(null);
    setExplorerPhase('wrong');
    setFeedback({ isCorrect: false, message: 'Te quedaste sin aire.' });
  }

  async function continueAfterAnswer() {
    const wasCorrect = feedback?.isCorrect;
    setFeedback(null);
    setExplorerPhase('idle');
    setTargetX(null);
    if (!wasCorrect) {
      setOxygenMs(isTimedAt(currentIndex) ? oxygenTotalMs : null);
      return; // se reintenta la misma pregunta
    }

    const next = currentIndex + 1;
    if (next >= questions.length) {
      setBusy(true);
      try {
        await api.post(`/play/sessions/${session.sessionId}/finish`);
        setPhase('done');
      } catch (err) {
        setError(err.message || 'No se pudo cerrar el juego');
      } finally {
        setBusy(false);
      }
      return;
    }
    goToIndex(next);
  }

  const currentBeat = phase === 'story' ? beatFor(currentIndex) : null;
  const oxygenPct = oxygenMs == null ? null : Math.round((oxygenMs / oxygenTotalMs) * 100);

  return (
    <div className="game-theme relative min-h-screen overflow-hidden" style={helper.style}>
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
            <p className="text-sm opacity-80">{data.quiz.questionCount} pregunta(s)</p>

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

        {phase === 'story' && currentBeat && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <p className="text-xl leading-relaxed opacity-95">{currentBeat.text}</p>
            <BigButton onClick={() => enterPlayPhase(currentIndex)}>Continuar</BigButton>
          </div>
        )}

        {phase === 'play' && currentQuestion && (
          <div className="relative flex flex-1 flex-col">
            <p className="mb-1 text-center text-base font-bold opacity-90">{currentQuestion.text}</p>
            <p className="mb-2 text-center text-sm opacity-70">
              Pregunta {currentIndex + 1} / {questions.length}
            </p>
            {oxygenPct != null && (
              <div className="mx-auto mb-2 h-3 w-full max-w-md overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-sky-400 transition-[width] duration-150"
                  style={{ width: `${oxygenPct}%`, backgroundColor: oxygenPct < 25 ? '#ef4444' : '#38bdf8' }}
                />
              </div>
            )}
            <div className="relative flex-1 overflow-hidden rounded-2xl">
              {webglOk ? (
                <Suspense fallback={<div className="absolute inset-0" />}>
                  <div className="absolute inset-0">
                    <PipesScene3D
                      options={currentQuestion.options}
                      phase={explorerPhase}
                      targetX={targetX}
                      onPick={pick}
                    />
                  </div>
                </Suspense>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-lg font-semibold text-white">
                  Tu navegador no soporta gráficos 3D. Por favor abre el juego desde otro navegador o dispositivo
                  actualizado.
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ConfettiLayer />
            <WinFireworks />
            <div className="text-6xl">🎉</div>
            <h2 className="font-extrabold" style={{ fontSize: 'calc(2rem * var(--heading-scale,1))' }}>
              ¡Lo lograste!
            </h2>
            <p className="text-lg opacity-90">{settings.closingMessage || '¡Gracias por jugar!'}</p>
            <p className="text-base font-semibold opacity-80">
              {mistakes === 0 ? '🌟 ¡Sin errores, todos a la primera!' : `Lo lograste con ${mistakes} intento(s) extra.`}
            </p>
          </div>
        )}
      </div>

      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 text-center"
            style={{ backgroundColor: 'var(--card)', color: 'var(--card-text)' }}
          >
            <p className="text-2xl font-extrabold" style={{ color: feedback.isCorrect ? '#16a34a' : '#dc2626' }}>
              {feedback.isCorrect ? '¡Correcto!' : feedback.message || 'Incorrecto'}
            </p>
            {!feedback.isCorrect && <p className="mt-2 text-sm opacity-70">Inténtalo de nuevo.</p>}
            <button
              onClick={continueAfterAnswer}
              disabled={busy}
              className="mt-4 rounded-xl px-8 py-3 text-lg font-extrabold text-white shadow-lg hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: feedback.isCorrect ? 'var(--primary)' : '#dc2626' }}
            >
              {feedback.isCorrect ? 'Continuar' : 'Intentar de nuevo'}
            </button>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          </div>
        </div>
      )}
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
