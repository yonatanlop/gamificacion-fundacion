export const fullQuizInclude = {
  questions: {
    orderBy: { order: 'asc' },
    include: { options: { orderBy: { order: 'asc' } } },
  },
};

/** Arma el `data` de Prisma para crear una copia independiente de un quiz existente. */
export function buildQuizCopyData(src, { slug, createdById, title }) {
  return {
    slug,
    type: src.type,
    title: title ?? src.title,
    description: src.description,
    coverImage: src.coverImage,
    theme: src.theme,
    settings: src.settings,
    status: 'DRAFT',
    createdById,
    questions: {
      create: src.questions.map((q, qi) => ({
        order: qi,
        type: q.type,
        text: q.text,
        image: q.image,
        mediaType: q.mediaType,
        timeLimit: q.timeLimit,
        points: q.points,
        pointsMode: q.pointsMode,
        allowOther: q.allowOther,
        options: {
          create: q.options.map((o, oi) => ({
            order: oi,
            text: o.text,
            image: o.image,
            color: o.color,
            isCorrect: o.isCorrect,
          })),
        },
      })),
    },
  };
}

/** Normaliza el payload validado de una pregunta de Quiz a data de Prisma. */
export function questionCreateData(input, order) {
  return {
    order,
    type: input.type,
    text: input.text,
    image: input.image || null,
    mediaType: input.mediaType || (input.image ? 'image' : 'none'),
    timeLimit: input.timeLimit,
    points: input.points,
    pointsMode: input.pointsMode,
    allowOther: false,
    options: {
      create: input.options.map((o, i) => ({
        order: i,
        text: o.text || null,
        image: o.image || null,
        color: o.color || null,
        isCorrect: !!o.isCorrect,
      })),
    },
  };
}

/** Normaliza el payload validado de una pantalla de Sondeo a data de Prisma. */
export function surveyScreenData(input, order) {
  return {
    order,
    type: input.type, // SINGLE = elegir una ; MULTIPLE = elegir varias
    text: input.text,
    image: input.image || null,
    mediaType: input.image ? 'image' : 'none',
    timeLimit: 0,
    points: 0,
    pointsMode: 'ZERO',
    allowOther: !!input.allowOther,
    options: {
      create: input.options.map((o, i) => ({
        order: i,
        text: o.text || null,
        image: o.image || null,
        color: o.color || null,
        isCorrect: false,
      })),
    },
  };
}
