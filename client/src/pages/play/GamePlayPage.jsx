import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { themeToStyle } from '../../lib/theme.js';
import { loadGame, saveGame } from '../../lib/playStore.js';
import AnswerGrid from '../../components/AnswerGrid.jsx';

export default function GamePlayPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const game = useMemo(() => loadGame(slug), [slug]);

  const [index, setIndex] = useState(game?.index || 0);
  const [selected, setSelected] = useState([]);
  const [phase, setPhase] = useState('question'); // question | feedback
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());
  const answersRef = useRef(game?.answers || []);
  const selectedRef = useRef([]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const quiz = game?.quiz;
  const question = quiz?.questions[index];
  const helper = useMemo(() => (quiz ? themeToStyle(quiz.theme) : null), [quiz]);
  const showTimer = quiz?.settings?.showTimer !== false && quiz?.theme?.showTimer !== false;

  const submit = useCallback(
    async (picks) => {
      if (submitting || phase !== 'question') return;
      setSubmitting(true);
      const timeMs = Date.now() - startRef.current;
      try {
        const res = await api.post(`/play/sessions/${game.sessionId}/answer`, {
          questionId: question.id,
          selectedOptionIds: picks,
          timeMs,
        });
        answersRef.current = [...answersRef.current, { questionId: question.id, ...res }];
        saveGame(slug, { ...game, index, answers: answersRef.current });
        setResult(res);
        setPhase('feedback');
      } catch (err) {
        // Si ya se respondió (p.ej. doble envío), avanza igual.
        setResult({ isCorrect: false, pointsAwarded: 0, correctOptionIds: [], error: err.message });
        setPhase('feedback');
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, phase, game, question, index, slug],
  );

  // Temporizador por pregunta
  useEffect(() => {
    if (!question) return undefined;
    startRef.current = Date.now();
    setSelected([]);
    setResult(null);
    setPhase('question');
    setTimeLeft(question.timeLimit);
    const iv = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const left = Math.max(0, question.timeLimit - elapsed);
      setTimeLeft(left);
      if (left <= 0) clearInterval(iv);
    }, 200);
    return () => clearInterval(iv);
  }, [question]);

  // Auto-envío al agotar el tiempo (nunca en el primer render: timeLeft empieza en null)
  useEffect(() => {
    if (phase === 'question' && question && timeLeft !== null && timeLeft <= 0) {
      submit(selectedRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, question]);

  if (!game || !quiz) return <Navigate to={`/play/${slug}`} replace />;
  if (game.done) return <Navigate to={`/play/${slug}/resultado`} replace />;
  if (!question) return <Navigate to={`/play/${slug}`} replace />;

  function pick(optionId) {
    if (phase !== 'question') return;
    if (question.type === 'MULTIPLE') {
      setSelected((s) => (s.includes(optionId) ? s.filter((x) => x !== optionId) : [...s, optionId]));
    } else {
      setSelected([optionId]);
      submit([optionId]);
    }
  }

  function next() {
    const nextIndex = index + 1;
    if (nextIndex >= quiz.questions.length) {
      saveGame(slug, { ...game, index: nextIndex, answers: answersRef.current, done: true });
      navigate(`/play/${slug}/resultado`);
    } else {
      setIndex(nextIndex);
      saveGame(slug, { ...game, index: nextIndex, answers: answersRef.current });
    }
  }

  const total = quiz.questions.length;
  const runningScore = answersRef.current.reduce((a, x) => a + (x.pointsAwarded || 0), 0);
  const showProgress = quiz.settings?.showProgressBar !== false && quiz.theme?.showProgressBar !== false;

  return (
    <div className="game-theme min-h-screen" style={helper.style}>
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            Pregunta {index + 1} / {total}
          </span>
          <span>{runningScore} pts</span>
        </div>
        {showProgress && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>
        )}

        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <h2 className="font-bold" style={{ fontSize: `calc(1.6rem * var(--heading-scale,1))` }}>
            {question.text}
          </h2>
          {question.image && (
            <img src={question.image} alt="" className="max-h-56 rounded-xl object-contain shadow-lg" />
          )}

          {showTimer && phase === 'question' && timeLeft !== null && (
            <div className="text-3xl font-black tabular-nums">{Math.ceil(timeLeft)}</div>
          )}

          <AnswerGrid
            options={question.options}
            helper={helper}
            selected={selected}
            correctIds={phase === 'feedback' && result?.correctOptionIds?.length ? result.correctOptionIds : null}
            disabled={phase === 'feedback' || submitting}
            layout={helper.theme.answerLayout}
            onPick={pick}
          />

          {question.type === 'MULTIPLE' && phase === 'question' && (
            <button
              onClick={() => submit(selected)}
              disabled={selected.length === 0 || submitting}
              className="rounded-xl px-6 py-2 font-bold text-white shadow disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Confirmar respuesta
            </button>
          )}

          {phase === 'feedback' && result && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-2xl font-extrabold">
                {result.isCorrect ? `¡Correcto! +${result.pointsAwarded}` : 'Incorrecto'}
              </p>
              <button
                onClick={next}
                className="rounded-xl bg-white px-8 py-3 text-lg font-extrabold text-slate-900 shadow-lg hover:brightness-95"
              >
                {index + 1 >= total ? 'Ver resultados' : 'Siguiente'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
