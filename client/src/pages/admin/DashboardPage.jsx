import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Button, Card, Input, Select, Spinner, ConfirmButton } from '../../components/ui.jsx';

const publicPath = (quiz) => (quiz.type === 'SURVEY' ? `/s/${quiz.slug}` : `/play/${quiz.slug}`);
const publicUrl = (quiz) => `${window.location.origin}${publicPath(quiz)}`;

export default function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('QUIZ');
  const [copied, setCopied] = useState('');
  const [sharing, setSharing] = useState(null);
  const [shareEmail, setShareEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => api.authGet('/quizzes'),
  });

  const create = useMutation({
    mutationFn: () => api.authPost('/quizzes', { title: title.trim() || 'Nuevo juego', type }),
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

  const share = useMutation({
    mutationFn: () => api.authPost(`/quizzes/${sharing.id}/share`, { email: shareEmail.trim() }),
    onSuccess: () => {
      setSharing(null);
      setShareEmail('');
    },
  });

  async function copy(quiz) {
    try {
      await navigator.clipboard.writeText(publicUrl(quiz));
      setCopied(quiz.id);
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
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="Título"
            placeholder="Título del juego"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-[12rem] flex-1"
          />
          <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} className="w-48">
            <option value="QUIZ">Quiz (preguntas con puntaje)</option>
            <option value="SURVEY">Sondeo (consulta, sin puntaje)</option>
          </Select>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {type === 'SURVEY'
            ? 'Sondeo: pantallas simples para tocar opciones. Ideal para reflexión o lluvia de ideas guiada.'
            : 'Quiz: preguntas de opción con temporizador y puntaje.'}
        </p>
        {create.isError && <p className="mt-2 text-sm text-red-600">{create.error.message}</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800">{quiz.title}</h3>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {quiz.type === 'SURVEY' ? 'Sondeo' : 'Quiz'}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    quiz.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {quiz.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              {quiz._count.questions} {quiz.type === 'SURVEY' ? 'pantalla(s)' : 'pregunta(s)'} ·{' '}
              {quiz._count.sessions} respuesta(s)
            </p>
            {quiz.status === 'PUBLISHED' && (
              <button
                onClick={() => copy(quiz)}
                className="truncate rounded bg-slate-100 px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-200"
                title={publicUrl(quiz)}
              >
                {copied === quiz.id ? '¡Link copiado!' : publicUrl(quiz)}
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
              <Button
                variant="ghost"
                onClick={() => {
                  setSharing(quiz);
                  setShareEmail('');
                }}
              >
                Compartir
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

      {sharing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSharing(null)}
        >
          <Card className="w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Compartir "{sharing.title}"</h3>
            <p className="text-sm text-slate-500">
              El destinatario recibirá una notificación y, si la acepta, obtendrá su propia copia de este juego.
            </p>
            <Input
              label="Correo del destinatario"
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="persona@correo.com"
            />
            {share.isError && <p className="text-sm text-red-600">{share.error.message}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSharing(null)}>
                Cancelar
              </Button>
              <Button onClick={() => share.mutate()} disabled={!shareEmail.trim() || share.isPending}>
                {share.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
