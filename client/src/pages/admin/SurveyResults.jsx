import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Button, Card, Spinner } from '../../components/ui.jsx';

export default function SurveyResults() {
  const { id } = useParams();
  const [big, setBig] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['survey-results', id],
    queryFn: () => api.authGet(`/quizzes/${id}/survey-results`),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <p className="text-red-600">{error.message}</p>;

  const { quiz, respondents, screens } = data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/admin/quizzes/${id}`} className="text-sm text-slate-500 hover:text-indigo-700">
          ← Volver al editor
        </Link>
        <h1 className="font-display text-xl font-bold">Resultados · {quiz.title}</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => refetch()}>
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </Button>
          <Button variant="secondary" onClick={() => setBig((v) => !v)}>
            {big ? 'Vista normal' : 'Modo presentación'}
          </Button>
        </div>
      </div>

      <Card className="text-center">
        <p className="text-3xl font-extrabold text-indigo-700">{respondents}</p>
        <p className="text-xs text-slate-500">participante(s) han respondido</p>
      </Card>

      {screens.length === 0 || respondents === 0 ? (
        <p className="text-slate-500">Todavía nadie ha respondido este sondeo.</p>
      ) : (
        screens.map((s, i) => <ScreenResult key={s.questionId} screen={s} n={i + 1} big={big} />)
      )}
    </div>
  );
}

function ScreenResult({ screen, n, big }) {
  const total = Math.max(1, ...screen.options.map((o) => o.count));
  const answered = screen.answered || 1;
  return (
    <Card>
      <p className={`mb-3 font-bold text-slate-800 ${big ? 'text-2xl' : 'text-base'}`}>
        {n}. {screen.text}
      </p>
      <div className="space-y-2">
        {[...screen.options]
          .sort((a, b) => b.count - a.count)
          .map((o) => (
            <div key={o.id}>
              <div className={`flex justify-between ${big ? 'text-lg' : 'text-sm'}`}>
                <span className="text-slate-700">{o.text}</span>
                <span className="font-bold text-slate-900">
                  {o.count} · {Math.round((o.count / answered) * 100)}%
                </span>
              </div>
              <div className={`w-full overflow-hidden rounded bg-slate-100 ${big ? 'h-6' : 'h-4'}`}>
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${(o.count / total) * 100}%`, backgroundColor: o.color || '#2563eb' }}
                />
              </div>
            </div>
          ))}
      </div>
      {screen.others?.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Otras respuestas ({screen.others.length})
          </p>
          <ul className={`list-disc space-y-0.5 pl-5 text-slate-700 ${big ? 'text-base' : 'text-sm'}`}>
            {screen.others.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
