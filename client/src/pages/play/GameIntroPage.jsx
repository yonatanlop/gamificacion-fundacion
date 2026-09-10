import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { themeToStyle } from '../../lib/theme.js';
import { saveGame } from '../../lib/playStore.js';

export default function GameIntroPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['play', slug],
    queryFn: () => api.get(`/play/${slug}`),
  });

  if (isLoading) return <CenteredMsg>Cargando juego…</CenteredMsg>;
  if (isError) return <CenteredMsg>Este juego no está disponible.</CenteredMsg>;

  // Los sondeos tienen su propia pantalla.
  if (data.quiz.type === 'SURVEY') return <Navigate to={`/s/${slug}`} replace />;

  const quiz = data.quiz;
  const helper = themeToStyle(quiz.theme);
  const askNickname = quiz.settings.askNickname !== false;

  async function start() {
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/play/${slug}/start`, askNickname ? { nickname: nickname.trim() || undefined } : {});
      saveGame(slug, {
        sessionId: res.sessionId,
        playerId: res.playerId,
        quiz: res.quiz,
        index: 0,
        answers: [],
      });
      navigate(`/play/${slug}/jugar`);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el juego');
      setBusy(false);
    }
  }

  return (
    <div className="game-theme min-h-screen" style={helper.style}>
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        {quiz.theme?.logo && <img src={quiz.theme.logo} alt="" className="max-h-16 object-contain" />}
        {quiz.coverImage && (
          <img src={quiz.coverImage} alt="" className="max-h-52 rounded-2xl object-contain shadow-xl" />
        )}
        <h1 className="font-bold" style={{ fontSize: `calc(2rem * var(--heading-scale,1))` }}>
          {quiz.title}
        </h1>
        {quiz.description && <p className="opacity-90">{quiz.description}</p>}
        <p className="text-sm opacity-80">{quiz.questionCount} preguntas</p>

        {askNickname && (
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Tu apodo"
            maxLength={40}
            className="w-full rounded-xl border-0 px-4 py-3 text-center text-lg text-slate-900 shadow-lg outline-none"
          />
        )}
        {error && <p className="text-sm text-red-200">{error}</p>}
        <button
          onClick={start}
          disabled={busy}
          className="rounded-xl px-8 py-3 text-lg font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          {busy ? 'Preparando…' : 'Empezar'}
        </button>
      </div>
    </div>
  );
}

function CenteredMsg({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-slate-200">
      {children}
    </div>
  );
}
