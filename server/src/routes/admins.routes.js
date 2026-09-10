import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { adminCreateSchema, adminUpdateSchema } from '../validators/schemas.js';

const router = Router();
const publicFields = { id: true, email: true, name: true, role: true, createdAt: true };

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const admins = await prisma.admin.findMany({
      select: publicFields,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ admins });
  }),
);

router.post(
  '/',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const data = adminCreateSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const admin = await prisma.admin.create({
      data: { email: data.email.toLowerCase(), name: data.name, role: data.role, passwordHash },
      select: publicFields,
    });
    res.status(201).json({ admin });
  }),
);

router.patch(
  '/:id',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const data = adminUpdateSchema.parse(req.body);
    const patch = {};
    if (data.name) patch.name = data.name;
    if (data.role) patch.role = data.role;
    if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10);

    if (data.role && data.role !== 'OWNER') {
      await ensureNotLastOwner(req.params.id);
    }
    const admin = await prisma.admin.update({
      where: { id: req.params.id },
      data: patch,
      select: publicFields,
    });
    res.json({ admin });
  }),
);

router.delete(
  '/:id',
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.admin.id) {
      throw new HttpError(400, 'No puedes eliminar tu propia cuenta');
    }
    await ensureNotLastOwner(req.params.id);
    await prisma.admin.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

async function ensureNotLastOwner(id) {
  const target = await prisma.admin.findUnique({ where: { id } });
  if (target?.role !== 'OWNER') return;
  const owners = await prisma.admin.count({ where: { role: 'OWNER' } });
  if (owners <= 1) throw new HttpError(400, 'Debe existir al menos un administrador OWNER');
}

export default router;
