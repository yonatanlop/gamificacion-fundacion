import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, TOKEN_KEY } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setLoading(false);
      return () => {};
    }
    api
      .authGet('/auth/me')
      .then((d) => active && setAdmin(d.admin))
      .catch(() => active && setToken(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Si la sesión cambia en OTRA pestaña (se cerró, o se entró con otra cuenta), esta
  // pestaña se entera por el evento "storage" (solo llega a las pestañas que no hicieron
  // el cambio). Se recarga entera hacia el panel: así nunca sigue mostrando, con la
  // cuenta nueva, una pantalla (p. ej. el editor de un juego) que era de la cuenta
  // anterior y que ya no le pertenece — eso era lo que producía "Quiz no encontrado".
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== TOKEN_KEY) return;
      window.location.href = e.newValue ? '/admin' : '/login';
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      isOwner: admin?.role === 'OWNER',
      async login(email, password) {
        const d = await api.post('/auth/login', { email, password });
        setToken(d.token);
        setAdmin(d.admin);
        return d.admin;
      },
      logout() {
        setToken(null);
        setAdmin(null);
      },
    }),
    [admin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
