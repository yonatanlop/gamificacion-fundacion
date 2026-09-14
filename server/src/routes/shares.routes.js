import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { uniqueSlug } from '../lib/slug.js';
import { fullQuizInclude, buildQuizCopyData } from '../services/quizPayload.js';

const router = Router();
router.use(requireAuth);

const slugExists = (exceptId) => async (candidate) => {
  const found = await prisma.quiz.findUnique({ where: { slug: candidate } });
  return !!found && found.id !== exceptId;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const shares = await prisma.quizShare.findMany({
      where: { toAdminId: req.admin.id },
      orderBy: { createdAt: 'desc' },
      include: {
        quiz: { select: { id: true, title: true, type: true } },
        fromAdmin: { select: { id: true, name: true } },
      },
    });
    res.json({ shares });
  }),
);

router.post(
  '/:id/accept',
  asyncHandler(async (req, res) => {
    const share = await getShareOr404(req.params.id, req.admin.id);
    const src = await prisma.quiz.findUnique({ where: { id: share.quizId }, include: fullQuizInclude });
    if (!src) throw new HttpError(404, 'El juego compartido ya no existe');

    const slug = await uniqueSlug(src.slug, slugExists(null));
    const quiz = await prisma.$transaction(async (tx) => {
      const created = await tx.quiz.create({
        data: buildQuizCopyData(src, { slug, createdById: req.admin.id }),
        include: fullQuizInclude,
      });
      await tx.quizShare.delete({ where: { id: share.id } });
      return created;
    });
    res.status(201).json({ quiz });
  }),
);

router.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const share = await getShareOr404(req.params.id, req.admin.id);
    await prisma.quizShare.delete({ where: { id: share.id } });
    res.status(204).end();
  }),
);

async function getShareOr404(id, adminId) {
  const share = await prisma.quizShare.findUnique({ where: { id } });
  if (!share || share.toAdminId !== adminId) throw new HttpError(404, 'Invitación no encontrada');
  return share;
}

export default router;
