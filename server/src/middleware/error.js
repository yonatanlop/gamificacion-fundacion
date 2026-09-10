import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err && err.code === 'P2025') {
    return res.status(404).json({ error: 'Recurso no encontrado' });
  }
  if (err && err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El archivo es demasiado grande' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

/** Envuelve un handler async y pasa los errores a Express. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
