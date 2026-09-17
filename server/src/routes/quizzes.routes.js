import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import { mergeTheme, mergeSettings } from '../lib/defaults.js';
import {
  fullQuizInclude,
  questionCreateData,
  surveyScreenData,
  balloonQuestionData,
  buildQuizCopyData,
} from '../services/quizPayload.js';
import {
  quizCreateSchema,
  quizUpdateSchema,
  questionSchema,
  surveyScreenSchema,
  balloonQuestionSchema,
  reorderSchema,
  shareCreateSchema,
} from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

const slugExists = (slug, exceptId) => async (candidate) => {
  const found = await prisma.quiz.findUnique({ where: { slug: candidate } });
  return !!found && found.id !== exceptId;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const quizzes = await prisma.quiz.findMany({
      where: { createdById: req.admin.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { questions: true, sessions: true } },
      },
    });
    res.json({ quizzes });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = quizCreateSchema.parse(req.body);
    const slug = await uniqueSlug(data.slug || data.title, slugExists(null));
    const quiz = await prisma.quiz.create({
      data: {
        slug,
        type: data.type,
        title: data.title,
        description: data.description || null,
        coverImage: data.coverImage || null,
        theme: mergeTheme(data.theme),
        settings: mergeSettings(data.settings, data.type),
        createdById: req.admin.id,
      },
      include: fullQuizInclude,
    });
    res.status(201).json({ quiz });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    res.json({ quiz });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = quizUpdateSchema.parse(req.body);
    const existing = await getQuizOr404(req.params.id, req.admin.id);

    const patch = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description || null;
    if (data.coverImage !== undefined) patch.coverImage = data.coverImage || null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.theme !== undefined) patch.theme = mergeTheme(data.theme);
    if (data.settings !== undefined) patch.settings = mergeSettings(data.settings, existing.type);
    if (data.slug !== undefined && slugify(data.slug) !== existing.slug) {
      patch.slug = await uniqueSlug(data.slug, slugExists(null, existing.id));
    }

    const quiz = await prisma.quiz.update({
      where: { id: existing.id },
      data: patch,
      include: fullQuizInclude,
    });
    res.json({ quiz });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await getQuizOr404(req.params.id, req.admin.id);
    await prisma.quiz.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

router.post(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    if (quiz.questions.length === 0) {
      throw new HttpError(
        400,
        quiz.type === 'SURVEY'
          ? 'No se puede publicar un sondeo sin pantallas'
          : quiz.type === 'BALLOONS'
            ? 'No se puede publicar un juego de globos sin globos'
            : 'No se puede publicar un quiz sin preguntas',
      );
    }
    const updated = await prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: 'PUBLISHED' },
      include: fullQuizInclude,
    });
    res.json({ quiz: updated });
  }),
);

router.post(
  '/:id/unpublish',
  asyncHandler(async (req, res) => {
    await getQuizOr404(req.params.id, req.admin.id);
    const updated = await prisma.quiz.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT' },
      include: fullQuizInclude,
    });
    res.json({ quiz: updated });
  }),
);

router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const src = await getQuizOr404(req.params.id, req.admin.id);
    const slug = await uniqueSlug(`${src.slug}-copia`, slugExists(null));
    const quiz = await prisma.quiz.create({
      data: buildQuizCopyData(src, { slug, createdById: req.admin.id, title: `${src.title} (copia)` }),
      include: fullQuizInclude,
    });
    res.status(201).json({ quiz });
  }),
);

router.post(
  '/:id/share',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    const { email } = shareCreateSchema.parse(req.body);
    if (email === req.admin.email.toLowerCase()) {
      throw new HttpError(400, 'No puedes compartir contigo mismo');
    }
    const recipient = await prisma.admin.findUnique({ where: { email } });
    if (!recipient) throw new HttpError(404, 'No existe un usuario con ese correo');

    const share = await prisma.quizShare.upsert({
      where: { quizId_toAdminId: { quizId: quiz.id, toAdminId: recipient.id } },
      update: { createdAt: new Date() },
      create: { quizId: quiz.id, fromAdminId: req.admin.id, toAdminId: recipient.id },
    });
    res.status(201).json({ share });
  }),
);

router.post(
  '/:id/questions',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    const data =
      quiz.type === 'SURVEY'
        ? surveyScreenData(surveyScreenSchema.parse(req.body), quiz.questions.length)
        : quiz.type === 'BALLOONS'
          ? balloonQuestionData(balloonQuestionSchema.parse(req.body), quiz.questions.length)
          : questionCreateData(questionSchema.parse(req.body), quiz.questions.length);
    const question = await prisma.question.create({
      data: { quizId: quiz.id, ...data },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    res.status(201).json({ question });
  }),
);

router.post(
  '/:id/reorder-questions',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    const { orderedIds } = reorderSchema.parse(req.body);
    const owned = new Set(quiz.questions.map((q) => q.id));
    if (orderedIds.length !== owned.size || !orderedIds.every((id) => owned.has(id))) {
      throw new HttpError(400, 'La lista de preguntas no coincide con el quiz');
    }
    await prisma.$transaction(
      orderedIds.map((id, order) => prisma.question.update({ where: { id }, data: { order } })),
    );
    const updated = await getQuizOr404(quiz.id, req.admin.id);
    res.json({ quiz: updated });
  }),
);

router.get(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    const sessions = await prisma.gameSession.findMany({
      where: { quizId: quiz.id },
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: {
        players: {
          orderBy: { totalScore: 'desc' },
          include: { _count: { select: { answers: true } } },
        },
      },
    });
    const players = sessions.flatMap((s) => s.players);
    const finished = players.filter((p) => p.finishedAt);
    res.json({
      quiz: { id: quiz.id, title: quiz.title, slug: quiz.slug, type: quiz.type },
      stats: {
        sessions: sessions.length,
        players: players.length,
        completed: finished.length,
        avgScore: finished.length
          ? Math.round(finished.reduce((a, p) => a + p.totalScore, 0) / finished.length)
          : 0,
      },
      sessions,
    });
  }),
);

// Vacía las respuestas de un juego (borra partidas/jugadores/respuestas), sin tocar preguntas ni configuración.
router.delete(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    await prisma.gameSession.deleteMany({ where: { quizId: quiz.id } });
    res.status(204).end();
  }),
);

// Resultados agregados de un Sondeo: conteo por opción + textos "Otra".
router.get(
  '/:id/survey-results',
  asyncHandler(async (req, res) => {
    const quiz = await getQuizOr404(req.params.id, req.admin.id);
    if (quiz.type !== 'SURVEY') throw new HttpError(400, 'Este juego no es un sondeo');

    const answers = await prisma.playerAnswer.findMany({
      where: { player: { session: { quizId: quiz.id } } },
      select: { questionId: true, selectedOptionIds: true, otherText: true, playerId: true },
    });

    const respondents = new Set(answers.map((a) => a.playerId)).size;
    const screens = [...quiz.questions]
      .sort((a, b) => a.order - b.order)
      .map((q) => {
        const rows = answers.filter((a) => a.questionId === q.id);
        const counts = new Map(q.options.map((o) => [o.id, 0]));
        const others = [];
        for (const a of rows) {
          for (const oid of a.selectedOptionIds) {
            if (counts.has(oid)) counts.set(oid, counts.get(oid) + 1);
          }
          if (a.otherText && a.otherText.trim()) others.push(a.otherText.trim());
        }
        return {
          questionId: q.id,
          text: q.text,
          image: q.image,
          type: q.type,
          allowOther: q.allowOther,
          answered: rows.length,
          options: [...q.options]
            .sort((a, b) => a.order - b.order)
            .map((o) => ({ id: o.id, text: o.text, color: o.color, count: counts.get(o.id) || 0 })),
          others,
        };
      });

    res.json({
      quiz: { id: quiz.id, title: quiz.title, slug: quiz.slug, type: quiz.type },
      respondents,
      screens,
    });
  }),
);

export async function getQuizOr404(id, adminId) {
  const quiz = await prisma.quiz.findUnique({ where: { id }, include: fullQuizInclude });
  if (!quiz || quiz.createdById !== adminId) throw new HttpError(404, 'Quiz no encontrado');
  return quiz;
}

export { slugExists };

export default router;
