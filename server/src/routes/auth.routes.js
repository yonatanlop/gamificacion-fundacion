import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { loginSchema } from '../validators/schemas.js';

const router = Router();

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    const ok = admin && (await bcrypt.compare(password, admin.passwordHash));
    if (!ok) throw new HttpError(401, 'Correo o contraseña incorrectos');

    const token = signToken(admin);
    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ admin: req.admin });
  }),
);

export default router;
