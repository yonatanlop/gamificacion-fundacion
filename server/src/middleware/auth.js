import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../db.js';

export function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role, name: admin.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    const payload = jwt.verify(token, config.jwtSecret);
    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin) return res.status(401).json({ error: 'Sesión inválida' });

    req.admin = { id: admin.id, email: admin.email, role: admin.role, name: admin.name };
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    return next();
  };
}
