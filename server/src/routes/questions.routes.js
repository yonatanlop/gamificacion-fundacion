import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { questionSchema, surveyScreenSchema } from '../validators/schemas.js';
import { questionCreateData, surveyScreenData } from '../services/quizPayload.js';

const router = Router();
router.use(requireAuth);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.question.findUnique({
      where: { id: req.params.id },
      include: { quiz: { select: { type: true } } },
    });
    if (!existing) throw new HttpError(404, 'Pregunta no encontrada');

    const data =
      existing.quiz.type === 'SURVEY'
        ? surveyScreenData(surveyScreenSchema.parse(req.body), existing.order)
        : questionCreateData(questionSchema.parse(req.body), existing.order);

    // Reemplaza las opciones por completo (más simple y predecible que hacer diff).
    const question = await prisma.$transaction(async (tx) => {
      await tx.answerOption.deleteMany({ where: { questionId: existing.id } });
      return tx.question.update({
        where: { id: existing.id },
        data,
        include: { options: { orderBy: { order: 'asc' } } },
      });
    });
    res.json({ question });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const q = await prisma.question.findUnique({ where: { id: req.params.id } });
    if (!q) throw new HttpError(404, 'Pregunta no encontrada');
    await prisma.$transaction(async (tx) => {
      await tx.question.delete({ where: { id: q.id } });
      const rest = await tx.question.findMany({
        where: { quizId: q.quizId },
        orderBy: { order: 'asc' },
      });
      await Promise.all(
        rest.map((item, order) => tx.question.update({ where: { id: item.id }, data: { order } })),
      );
    });
    res.status(204).end();
  }),
);

export default router;
