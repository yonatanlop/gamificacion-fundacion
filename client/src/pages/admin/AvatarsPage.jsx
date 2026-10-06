import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Button, Card, ConfirmButton, Spinner } from '../../components/ui.jsx';

const EMPTY = {
  name: 'Nuevo avatar',
  config: {
    params: { gender: 0, muscle: 0.5, weight: 0.5, height: 0, faces: {} },
    look: { skin: '#e0b08a', eyes: '#4b3621', hair: '#2b1d14', pants: '#1e3a8a', skirt: '#7c2d12', skirtOn: false, background: '#dbeafe' },
  },
  script: ['¡Hola! Bienvenido a la clase.'],
};

export default function AvatarsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['avatars'],
    queryFn: () => api.authGet('/avatars'),
  });

  const create = useMutation({
    mutationFn: () => api.authPost('/avatars', EMPTY),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['avatars'] });
      navigate(`/admin/avatares/${d.avatar.id}`);
    },
  });
  const remove = useMutation({
    mutationFn: (id) => api.authDel(`/avatars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['avatars'] }),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <p className="text-red-600">{error.message}</p>;
  const avatars = data?.avatars || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Avatares 3D</h1>
          <p className="text-sm text-slate-500">
            Personajes humanos personalizables que pueden hablar con voz. Cada uno guarda su guion.
          </p>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? 'Creando…' : '+ Nuevo avatar'}
        </Button>
      </div>

      {avatars.length === 0 ? (
        <Card>
          <p className="text-slate-500">Todavía no tienes avatares. Crea uno para empezar.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avatars.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3">
              <h3 className="font-semibold text-slate-800">{a.name}</h3>
              <p className="text-sm text-slate-500">
                {Array.isArray(a.script) ? a.script.length : 0} línea(s) · {a.voiceId ? 'con voz' : 'sin voz'}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => navigate(`/admin/avatares/${a.id}`)}>
                  Editar
                </Button>
                <ConfirmButton onConfirm={() => remove.mutate(a.id)} confirmLabel="¿Eliminar?">
                  Eliminar
                </ConfirmButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
