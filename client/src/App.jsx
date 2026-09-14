import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Spinner } from './components/ui.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import QuizEditorPage from './pages/admin/QuizEditorPage.jsx';
import ResultsPage from './pages/admin/ResultsPage.jsx';
import SurveyPresent from './pages/admin/SurveyPresent.jsx';
import AdminsPage from './pages/admin/AdminsPage.jsx';
import IconLibraryPage from './pages/admin/IconLibraryPage.jsx';
import ShareBell from './components/ShareBell.jsx';
import GameIntroPage from './pages/play/GameIntroPage.jsx';
import GamePlayPage from './pages/play/GamePlayPage.jsx';
import GameResultPage from './pages/play/GameResultPage.jsx';
import SurveyRunner from './pages/play/SurveyRunner.jsx';

function RequireAuth({ children }) {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Verificando sesión…" />;
  if (!admin) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AdminShell({ children }) {
  const { admin, logout, isOwner } = useAuth();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/admin" className="font-display text-lg font-extrabold text-indigo-700">
            Gamificaciones
          </Link>
          <nav className="flex gap-3 text-sm">
            <Link to="/admin" className="text-slate-600 hover:text-indigo-700">
              Juegos
            </Link>
            <Link to="/admin/iconos" className="text-slate-600 hover:text-indigo-700">
              Íconos
            </Link>
            {isOwner && (
              <Link to="/admin/usuarios" className="text-slate-600 hover:text-indigo-700">
                Usuarios
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <ShareBell />
            <span>{admin?.name}</span>
            <button onClick={logout} className="rounded bg-slate-200 px-3 py-1 hover:bg-slate-300">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminShell>
              <DashboardPage />
            </AdminShell>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/quizzes/:id"
        element={
          <RequireAuth>
            <AdminShell>
              <QuizEditorPage />
            </AdminShell>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/quizzes/:id/resultados"
        element={
          <RequireAuth>
            <AdminShell>
              <ResultsPage />
            </AdminShell>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/quizzes/:id/presentar"
        element={
          <RequireAuth>
            <SurveyPresent />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/iconos"
        element={
          <RequireAuth>
            <AdminShell>
              <IconLibraryPage />
            </AdminShell>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <RequireAuth>
            <AdminShell>
              <AdminsPage />
            </AdminShell>
          </RequireAuth>
        }
      />

      <Route path="/play/:slug" element={<GameIntroPage />} />
      <Route path="/play/:slug/jugar" element={<GamePlayPage />} />
      <Route path="/play/:slug/resultado" element={<GameResultPage />} />

      {/* Sondeo / Consulta rápida */}
      <Route path="/s/:slug" element={<SurveyRunner />} />

      <Route path="*" element={<div className="p-10 text-center text-slate-500">Página no encontrada</div>} />
    </Routes>
  );
}
