import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Button } from './ui.jsx';

/**
 * Campanita de notificaciones de juegos compartidos. Aceptar crea una copia
 * propia del juego (ver POST /api/shares/:id/accept); rechazar solo descarta
 * la invitación.
 */
export default function ShareBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['shares'],
    queryFn: () => api.authGet('/shares'),
    refetchInterval: 15000,
  });

  const accept = useMutation({
    mutationFn: (id) => api.authPost(`/shares/${id}/accept`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shares'] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  const reject = useMutation({
    mutationFn: (id) => api.authPost(`/shares/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shares'] }),
  });

  const shares = data?.shares || [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notificaciones"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
          />
        </svg>
        {shares.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {shares.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Juegos compartidos contigo
            </p>
            {shares.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-500">No tienes invitaciones pendientes.</p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {shares.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-100 p-2">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{s.fromAdmin.name}</span> te compartió{' '}
                      <span className="font-semibold">{s.quiz.title}</span>{' '}
                      <span className="text-xs text-slate-400">
                        ({s.quiz.type === 'SURVEY' ? 'Sondeo' : 'Quiz'})
                      </span>
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        className="px-3 py-1 text-xs"
                        disabled={accept.isPending || reject.isPending}
                        onClick={() => accept.mutate(s.id)}
                      >
                        Aceptar
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        disabled={accept.isPending || reject.isPending}
                        onClick={() => reject.mutate(s.id)}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
