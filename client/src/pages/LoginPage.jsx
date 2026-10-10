import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { Button, Input, Card } from '../components/ui.jsx';

// Adónde volver tras iniciar sesión. Si la pantalla anterior era la de un juego en
// concreto (editor, resultados, presentar, ruleta), primero se confirma que ESE juego
// sea de la cuenta que acaba de entrar — si no, puede ser el de otra cuenta (p. ej. tras
// compartir un juego y cambiar de usuario en el mismo navegador) y mandar ahí daría
// "Quiz no encontrado". En cualquier otro caso (o sin pantalla previa) se va al panel.
async function resolveLoginDestination(fromPathname) {
  const match = fromPathname?.match(/^\/admin\/quizzes\/([^/]+)/);
  if (!match) return fromPathname || '/admin';
  try {
    await api.authGet(`/quizzes/${match[1]}`);
    return fromPathname;
  } catch {
    return '/admin';
  }
}

export default function LoginPage() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Si ya hay sesión (p. ej. se entró a /login por error, o quedó un token válido de
  // antes), al panel: no se reutiliza el "volver a" sin confirmar que sea de esta cuenta.
  if (admin) return <Navigate to="/admin" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
      const dest = await resolveLoginDestination(location.state?.from?.pathname);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold text-indigo-700">Gamificaciones</h1>
        <p className="mb-4 text-sm text-slate-500">Panel de administración</p>
        <form onSubmit={submit} className="space-y-3">
          <Input
            label="Correo"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
