import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client.js';

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
