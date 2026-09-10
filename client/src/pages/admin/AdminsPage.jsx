import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Card, Input, Select, Spinner, ConfirmButton } from '../../components/ui.jsx';

export default function AdminsPage() {
  const { isOwner, admin } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EDITOR' });

  const { data, isLoading } = useQuery({ queryKey: ['admins'], queryFn: () => api.authGet('/admins') });

  const create = useMutation({
    mutationFn: () => api.authPost('/admins', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      setForm({ name: '', email: '', password: '', role: 'EDITOR' });
    },
  });
  const remove = useMutation({
    mutationFn: (uid) => api.authDel(`/admins/${uid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  });

  if (!isOwner) return <Navigate to="/admin" replace />;
  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card className="max-w-lg space-y-3">
        <h2 className="font-display text-lg font-bold">Nuevo administrador</h2>
        <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input
          label="Correo"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Contraseña (mín. 8)"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Select label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="EDITOR">Editor</option>
          <option value="OWNER">Owner (control total)</option>
        </Select>
        {create.isError && <p className="text-sm text-red-600">{create.error.message}</p>}
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? 'Creando…' : 'Crear'}
        </Button>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Correo</th>
              <th className="py-2">Rol</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {(data?.admins || []).map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="py-2 font-medium text-slate-800">{a.name}</td>
                <td className="py-2">{a.email}</td>
                <td className="py-2">{a.role}</td>
                <td className="py-2 text-right">
                  {a.id !== admin.id && (
                    <ConfirmButton onConfirm={() => remove.mutate(a.id)} confirmLabel="¿Eliminar?">
                      Eliminar
                    </ConfirmButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {remove.isError && <p className="mt-2 text-sm text-red-600">{remove.error.message}</p>}
      </Card>
    </div>
  );
}
