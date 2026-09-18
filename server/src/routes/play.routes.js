import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { playLimiter } from '../middleware/rateLimit.js';
import { toPublicQuiz } from '../services/sanitize.js';
import { scoreAnswer } from '../services/scoring.js';
import { fullQuizInclude } from '../services/quizPayload.js';
import { startPlaySchema, answerSchema } from '../validators/schemas.js';

const router = Router();
router.use(playLimiter);

async function getPublishedQuiz(slug) {
  const quiz = await prisma.quiz.findUnique({ where: { slug }, include: fullQuizInclude });
  if (!quiz || quiz.status !== 'PUBLISHED') throw new HttpError(404, 'Juego no disponible');
  return quiz;
}

// Vista previa pública (sin sesión). Orden fijo, sin respuestas correctas.
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const quiz = await getPublishedQuiz(req.params.slug);
    res.json({ quiz: toPublicQuiz(quiz, { seed: 'preview' }) });
  }),
);

// Inicia una partida individual.
router.post(
  '/:slug/start',
  asyncHandler(async (req, res) => {
    const quiz = await getPublishedQuiz(req.params.slug);
    const body = startPlaySchema.parse(req.body || {});
    const settings = quiz.settings || {};
    if (quiz.type === 'SURVEY' && settings.acceptingResponses === false) {
      throw new HttpError(403, 'Este sondeo está cerrado y ya no admite respuestas.');
    }
    const nickname = (body.nickname || '').trim() || 'Invitado';

    const seed = randomUUID();
    const session = await prisma.gameSession.create({
      data: {
        quizId: quiz.id,
        mode: 'SOLO',
        shuffleSeed: seed,
        players: { create: { nickname } },
      },
      include: { players: true },
    });

    const publicQuiz = toPublicQuiz(quiz, {
      seed,
      shuffleQuestions: !!settings.shuffleQuestions,
      shuffleAnswers: !!settings.shuffleAnswers,
    });

    res.status(201).json({
      sessionId: session.id,
      playerId: session.players[0].id,
      quiz: publicQuiz,
    });
  }),
);

// Registra la respuesta de una pregunta y devuelve el resultado.
router.post(
  '/sessions/:sessionId/answer',
  asyncHandler(async (req, res) => {
    const { questionId, selectedOptionIds, otherText, timeMs } = answerSchema.parse(req.body);
    const { session, player, quiz } = await loadSession(req.params.sessionId);
    const isSurvey = quiz.type === 'SURVEY';
    const isBalloons = quiz.type === 'BALLOONS';

    const question = await prisma.question.findFirst({
      where: { id: questionId, quizId: session.quizId },
      include: { options: true },
    });
    if (!question) throw new HttpError(404, 'Pregunta no encontrada en este juego');

    const validIds = new Set(question.options.map((o) => o.id));
    const selected = [...new Set(selectedOptionIds)].filter((id) => validIds.has(id));
    const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
    const cleanOther = question.allowOther && otherText ? String(otherText).trim().slice(0, 500) : '';

    const { isCorrect, pointsAwarded } = isSurvey
      ? { isCorrect: false, pointsAwarded: 0 }
      : scoreAnswer({
          type: question.type,
          correctOptionIds,
          selectedOptionIds: selected,
          timeMs,
          timeLimit: question.timeLimit,
          points: question.points,
          pointsMode: question.pointsMode,
        });

    const existing = await prisma.playerAnswer.findUnique({
      where: { playerId_questionId: { playerId: player.id, questionId } },
    });
    if (existing) {
      // En el sondeo, permitir corregir la respuesta antes de terminar.
      if (isSurvey) {
        await prisma.playerAnswer.update({
          where: { playerId_questionId: { playerId: player.id, questionId } },
          data: { selectedOptionIds: selected, otherText: cleanOther || null },
        });
        return res.json({ ok: true, updated: true });
      }
      throw new HttpError(409, 'Esta pregunta ya fue respondida');
    }

    // Globos: un intento fallido no se guarda ni cuenta como respondida — el
    // globo sigue disponible para volver a intentarlo hasta acertar.
    if (isBalloons && !isCorrect) {
      return res.json({ isCorrect: false, pointsAwarded: 0, correctOptionIds });
    }

    await prisma.$transaction([
      prisma.playerAnswer.create({
        data: {
          playerId: player.id,
          questionId,
          selectedOptionIds: selected,
          otherText: cleanOther || null,
          isCorrect,
          timeMs,
          pointsAwarded,
        },
      }),
      prisma.player.update({
        where: { id: player.id },
        data: { totalScore: { increment: pointsAwarded } },
      }),
    ]);

    if (isSurvey) return res.json({ ok: true });
    return res.json({
      isCorrect,
      pointsAwarded,
      totalScore: player.totalScore + pointsAwarded,
      correctOptionIds,
    });
  }),
);

// Finaliza la partida y devuelve el resumen.
router.post(
  '/sessions/:sessionId/finish',
  asyncHandler(async (req, res) => {
    const { session, player, quiz } = await loadSession(req.params.sessionId);

    if (!player.finishedAt) {
      await prisma.player.update({ where: { id: player.id }, data: { finishedAt: new Date() } });
    }
    const stillActive = await prisma.player.count({
      where: { sessionId: session.id, finishedAt: null },
    });
    if (stillActive === 0) {
      await prisma.gameSession.update({
        where: { id: session.id },
        data: { status: 'FINISHED', finishedAt: new Date() },
      });
    }

    const questions = [...quiz.questions].sort((a, b) => a.order - b.order);

    if (quiz.type === 'SURVEY') {
      const settings = quiz.settings || {};
      const vis = settings.resultsVisibility || 'admin';
      const payload = {
        type: 'SURVEY',
        closingMessage: settings.closingMessage || '¡Listo! Tu respuesta quedó registrada. Muchas gracias.',
        showResults: vis === 'end',
      };
      if (vis === 'end') {
        const all = await prisma.playerAnswer.findMany({
          where: { player: { session: { quizId: quiz.id } } },
          select: { questionId: true, selectedOptionIds: true, otherText: true, playerId: true },
        });
        payload.respondents = new Set(all.map((a) => a.playerId)).size;
        payload.screens = questions.map((q) => {
          const rows = all.filter((a) => a.questionId === q.id);
          const counts = new Map(q.options.map((o) => [o.id, 0]));
          for (const a of rows) {
            for (const oid of a.selectedOptionIds) if (counts.has(oid)) counts.set(oid, counts.get(oid) + 1);
          }
          return {
            questionId: q.id,
            text: q.text,
            options: [...q.options]
              .sort((a, b) => a.order - b.order)
              .map((o) => ({ id: o.id, text: o.text, color: o.color, count: counts.get(o.id) || 0 })),
          };
        });
      }
      return res.json(payload);
    }

    const answers = await prisma.playerAnswer.findMany({ where: { playerId: player.id } });
    const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
    const showCorrect = (quiz.settings || {}).showCorrectAtEnd !== false;

    const review = questions.map((q) => {
      const a = byQuestion.get(q.id);
      return {
        questionId: q.id,
        text: q.text,
        answered: !!a,
        isCorrect: a ? a.isCorrect : false,
        pointsAwarded: a ? a.pointsAwarded : 0,
        selectedOptionIds: a ? a.selectedOptionIds : [],
        correctOptionIds: showCorrect ? q.options.filter((o) => o.isCorrect).map((o) => o.id) : undefined,
        options: showCorrect
          ? q.options
              .sort((x, y) => x.order - y.order)
              .map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect }))
          : undefined,
      };
    });

    const correctCount = review.filter((r) => r.isCorrect).length;
    const finalScore = answers.reduce((acc, a) => acc + a.pointsAwarded, 0);

    res.json({
      score: finalScore,
      correctCount,
      total: questions.length,
      accuracy: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
      showCorrect,
      review,
    });
  }),
);

async function loadSession(sessionId) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { players: true, quiz: { include: fullQuizInclude } },
  });
  if (!session) throw new HttpError(404, 'Sesión no encontrada');
  const player = session.players[0];
  if (!player) throw new HttpError(404, 'Jugador no encontrado');
  return { session, player, quiz: session.quiz };
}

export default router;
