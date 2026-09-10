import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Card, Spinner } from '../../components/ui.jsx';
import SurveyResults from './SurveyResults.jsx';

export default function ResultsPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['results', id],
    queryFn: () => api.authGet(`/quizzes/${id}/results`),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <p className="text-red-600">{error.message}</p>;

  if (data.quiz.type === 'SURVEY') return <SurveyResults />;

  const { quiz, stats, sessions } = data;

  return (
    <div className="space-y-4">
      <Link to={`/admin/quizzes/${id}`} className="text-sm text-slate-500 hover:text-indigo-700">
        ← Volver al editor
      </Link>
      <h1 className="font-display text-xl font-bold">Resultados · {quiz.title}</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Partidas', stats.sessions],
          ['Jugadores', stats.players],
          ['Completadas', stats.completed],
          ['Puntaje promedio', stats.avgScore],
        ].map(([label, value]) => (
          <Card key={label} className="text-center">
            <p className="text-2xl font-extrabold text-indigo-700">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </Card>
        ))}
      </div>

      <Card>
        {sessions.length === 0 && <p className="text-slate-500">Todavía nadie ha jugado.</p>}
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id}>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">
                {new Date(session.startedAt).toLocaleString()} ·{' '}
                {session.status === 'FINISHED' ? 'finalizada' : 'en curso'}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-1">Jugador</th>
                    <th className="py-1">Puntaje</th>
                    <th className="py-1">Respondidas</th>
                    <th className="py-1">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {session.players.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="py-1 font-medium text-slate-800">{p.nickname}</td>
                      <td className="py-1">{p.totalScore}</td>
                      <td className="py-1">{p._count.answers}</td>
                      <td className="py-1">{p.finishedAt ? 'Terminó' : 'Jugando'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
