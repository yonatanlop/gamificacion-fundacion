import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Button, Card, Input, Spinner, ConfirmButton } from '../../components/ui.jsx';

function playUrl(slug) {
  return `${window.location.origin}/play/${slug}`;
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [copied, setCopied] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => api.authGet('/quizzes'),
  });

  const create = useMutation({
    mutationFn: () => api.authPost('/quizzes', { title: title.trim() || 'Nuevo juego' }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      navigate(`/admin/quizzes/${d.quiz.id}`);
    },
  });

  const duplicate = useMutation({
    mutationFn: (id) => api.authPost(`/quizzes/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  });

  const remove = useMutation({
    mutationFn: (id) => api.authDel(`/quizzes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] }),
  });

  async function copy(slug) {
    try {
      await navigator.clipboard.writeText(playUrl(slug));
      setCopied(slug);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  }

  if (isLoading) return <Spinner />;
  const quizzes = data?.quizzes || [];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">Crear un juego</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Título del juego"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear'}
          </Button>
        </div>
        {create.isError && <p className="mt-2 text-sm text-red-600">{create.error.message}</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800">{quiz.title}</h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  quiz.status === 'PUBLISHED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {quiz.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {quiz._count.questions} pregunta(s) · {quiz._count.sessions} partida(s)
            </p>
            {quiz.status === 'PUBLISHED' && (
              <button
                onClick={() => copy(quiz.slug)}
                className="truncate rounded bg-slate-100 px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-200"
                title={playUrl(quiz.slug)}
              >
                {copied === quiz.slug ? '¡Link copiado!' : playUrl(quiz.slug)}
              </button>
            )}
            <div className="mt-auto flex flex-wrap gap-2">
              <Link to={`/admin/quizzes/${quiz.id}`}>
                <Button variant="secondary">Editar</Button>
              </Link>
              <Link to={`/admin/quizzes/${quiz.id}/resultados`}>
                <Button variant="ghost">Resultados</Button>
              </Link>
              <Button variant="ghost" onClick={() => duplicate.mutate(quiz.id)}>
                Duplicar
              </Button>
              <ConfirmButton onConfirm={() => remove.mutate(quiz.id)} confirmLabel="¿Eliminar?">
                Eliminar
              </ConfirmButton>
            </div>
          </Card>
        ))}
        {quizzes.length === 0 && (
          <p className="text-slate-500">Aún no hay juegos. Crea el primero arriba.</p>
        )}
      </div>
    </div>
  );
}
