const BASE = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = 'gf_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, path, body, { auth = false, raw = false } = {}) {
  const headers = {};
  const opts = { method, headers };

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}/api${path}`, opts);
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) setToken(null);
    throw new ApiError(res.status, data.error || `Error ${res.status}`, data.details);
  }
  return raw ? res : data;
}

export const api = {
  get: (path, opts) => request('GET', path, undefined, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  del: (path, opts) => request('DELETE', path, undefined, opts),

  // Autenticado
  authGet: (path) => request('GET', path, undefined, { auth: true }),
  authPost: (path, body) => request('POST', path, body, { auth: true }),
  authPatch: (path, body) => request('PATCH', path, body, { auth: true }),
  authDel: (path) => request('DELETE', path, undefined, { auth: true }),

  async upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/uploads', fd, { auth: true });
  },
};
