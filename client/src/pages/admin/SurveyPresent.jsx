import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';

/**
 * Vista de proyección a pantalla completa (sin menú de administración).
 * Requiere sesión de docente. Se refresca sola cada 4 s.
 */
export default function SurveyPresent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0..N-1 = pantalla ; N = resumen
  const [live, setLive] = useState(true);

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['survey-results', id],
    queryFn: () => api.authGet(`/quizzes/${id}/survey-results`),
    refetchInterval: live ? 4000 : false,
    refetchIntervalInBackground: true,
  });

  const screens = data?.screens || [];
  const total = screens.length;
  const atSummary = step >= total;

  const go = (dir) => setStep((s) => Math.min(total, Math.max(0, s + dir)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
      else if (e.key === 'Escape') navigate(`/admin/quizzes/${id}/resultados`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, id]);

  if (isLoading) return <Shell>Cargando…</Shell>;
  if (isError) return <Shell>{error.message}</Shell>;

  const screen = screens[step];
  const secondsAgo = Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000));

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900 text-white">
      {/* Barra superior */}
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-3 text-sm">
        <span className="font-bold text-white/70">{data.quiz.title}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 font-bold">
          {data.respondents} participante(s)
        </span>
        <span className="flex items-center gap-2 text-white/50">
          <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-green-400' : 'bg-white/30'}`} />
          {live ? `en vivo · hace ${secondsAgo}s` : 'pausado'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setLive((v) => !v)} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">
            {live ? 'Pausar' : 'Reanudar'}
          </button>
          <button
            onClick={() => navigate(`/admin/quizzes/${id}/resultados`)}
            className="rounded bg-white/10 px-3 py-1 hover:bg-white/20"
          >
            Salir ✕
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
        {total === 0 || data.respondents === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-3xl font-bold text-white/60">
            Esperando respuestas…
          </div>
        ) : atSummary ? (
          <div>
            <h2 className="mb-6 text-center text-3xl font-extrabold">Resumen</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {screens.map((s, i) => (
                <div key={s.questionId} className="rounded-2xl bg-white/5 p-5">
                  <p className="mb-3 text-xl font-bold">
                    {i + 1}. {s.text}
                  </p>
                  <Bars screen={s} compact />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <p className="mb-2 text-center text-xl font-bold text-white/50">
              Pregunta {step + 1} de {total}
            </p>
            <h2 className="mb-8 text-center text-4xl font-extrabold leading-tight">{screen.text}</h2>
            <div className="mx-auto w-full max-w-4xl">
              <Bars screen={screen} />
            </div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-4 border-t border-white/10 px-6 py-4">
        <NavButton onClick={() => go(-1)} disabled={step === 0}>
          ← Anterior
        </NavButton>
        <div className="flex gap-1.5">
          {Array.from({ length: total + 1 }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i === step ? 'bg-white' : 'bg-white/25'}`}
            />
          ))}
        </div>
        <NavButton onClick={() => go(1)} disabled={atSummary}>
          {step === total - 1 ? 'Ver resumen →' : 'Siguiente →'}
        </NavButton>
      </div>
    </div>
  );
}

function Bars({ screen, compact = false }) {
  const answered = Math.max(1, screen.answered || 1);
  const max = Math.max(1, ...screen.options.map((o) => o.count));
  const sorted = [...screen.options].sort((a, b) => b.count - a.count);
  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {sorted.map((o) => (
        <div key={o.id}>
          <div className={`flex items-baseline justify-between ${compact ? 'text-base' : 'text-2xl'}`}>
            <span className="pr-4 font-semibold">{o.text}</span>
            <span className="shrink-0 font-extrabold">
              {o.count} · {Math.round((o.count / answered) * 100)}%
            </span>
          </div>
          <div className={`w-full overflow-hidden rounded-full bg-white/10 ${compact ? 'h-4' : 'h-8'}`}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(o.count / max) * 100}%`, backgroundColor: o.color || '#38bdf8' }}
            />
          </div>
        </div>
      ))}
      {screen.others?.length > 0 && (
        <div className="mt-3 rounded-xl bg-white/5 p-3">
          <p className="mb-1 text-sm font-bold uppercase tracking-wide text-white/50">
            Otras respuestas ({screen.others.length})
          </p>
          <ul className={`list-disc space-y-0.5 pl-6 ${compact ? 'text-sm' : 'text-lg'}`}>
            {screen.others.slice(0, compact ? 4 : 12).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NavButton({ children, ...props }) {
  return (
    <button
      className="rounded-xl bg-white/10 px-6 py-3 text-lg font-bold hover:bg-white/20 disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}

function Shell({ children }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-center text-xl text-white">
      {children}
    </div>
  );
}
