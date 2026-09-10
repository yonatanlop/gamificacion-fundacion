import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { themeToStyle } from '../../lib/theme.js';
import { loadGame, clearGame } from '../../lib/playStore.js';

export default function GameResultPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const game = useMemo(() => loadGame(slug), [slug]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!game) return;
    api
      .post(`/play/sessions/${game.sessionId}/finish`)
      .then(setData)
      .catch((err) => setError(err.message || 'No se pudo cargar el resultado'));
  }, [game]);

  if (!game) return <Navigate to={`/play/${slug}`} replace />;

  const helper = themeToStyle(game.quiz.theme);
  const questionsById = new Map(game.quiz.questions.map((q) => [q.id, q]));

  return (
    <div className="game-theme min-h-screen" style={helper.style}>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-6 p-6 text-center">
        <h1 className="font-bold" style={{ fontSize: `calc(2rem * var(--heading-scale,1))` }}>
          {game.quiz.title}
        </h1>

        {error && <p className="text-red-200">{error}</p>}
        {!data && !error && <p className="opacity-80">Calculando resultado…</p>}

        {data && (
          <>
            <div className="rounded-2xl bg-white/15 px-8 py-6">
              <p className="text-5xl font-black">{data.score}</p>
              <p className="mt-1 opacity-90">puntos</p>
              <p className="mt-3 text-lg">
                {data.correctCount} de {data.total} correctas · {data.accuracy}%
              </p>
            </div>

            {data.showCorrect && (
              <div className="w-full space-y-2 text-left">
                {data.review.map((r, i) => {
                  const q = questionsById.get(r.questionId);
                  return (
                    <div
                      key={r.questionId}
                      className="rounded-xl bg-white/10 p-3"
                    >
                      <p className="font-semibold">
                        {i + 1}. {r.text}{' '}
                        <span className={r.isCorrect ? 'text-green-300' : 'text-red-300'}>
                          {r.answered ? (r.isCorrect ? '✓' : '✗') : '—'}
                        </span>
                      </p>
                      {r.options && (
                        <ul className="mt-1 text-sm opacity-90">
                          {r.options.map((o) => (
                            <li key={o.id}>
                              {o.isCorrect ? '✔️ ' : '• '}
                              {o.text}
                              {r.selectedOptionIds.includes(o.id) ? '  (tu respuesta)' : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!r.options && q && <span className="text-xs opacity-70">{q.type}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                clearGame(slug);
                navigate(`/play/${slug}`);
              }}
              className="rounded-xl px-8 py-3 text-lg font-extrabold text-white shadow-lg hover:brightness-110"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Jugar de nuevo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
