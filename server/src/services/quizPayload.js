export const fullQuizInclude = {
  questions: {
    orderBy: { order: 'asc' },
    include: { options: { orderBy: { order: 'asc' } } },
  },
};

/** Normaliza el payload validado de una pregunta a data de Prisma (con opciones anidadas). */
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
