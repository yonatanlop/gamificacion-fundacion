import { seededShuffle } from '../lib/shuffle.js';

/**
 * Convierte un quiz de la base en la forma pública para jugar,
 * QUITANDO cualquier señal de cuál es la respuesta correcta.
 *
 * @param {object} quiz  quiz con questions -> options incluidas
 * @param {object} opts
 * @param {string} opts.seed          semilla para barajar (por sesión)
 * @param {boolean} opts.shuffleQuestions
 * @param {boolean} opts.shuffleAnswers
 */
export function toPublicQuiz(quiz, { seed = 'static', shuffleQuestions = false, shuffleAnswers = false } = {}) {
  let questions = [...(quiz.questions || [])].sort((a, b) => a.order - b.order);
  if (shuffleQuestions) questions = seededShuffle(questions, `${seed}:q`);

  return {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    coverImage: quiz.coverImage,
    theme: quiz.theme,
    settings: publicSettings(quiz.settings),
    questionCount: questions.length,
    questions: questions.map((q) => {
      let options = [...(q.options || [])].sort((a, b) => a.order - b.order);
      if (shuffleAnswers) options = seededShuffle(options, `${seed}:a:${q.id}`);
      return {
        id: q.id,
        type: q.type,
        text: q.text,
        image: q.image,
        mediaType: q.mediaType,
        timeLimit: q.timeLimit,
        points: q.points,
        pointsMode: q.pointsMode,
        options: options.map((o) => ({
          id: o.id,
          text: o.text,
          image: o.image,
          color: o.color,
          // ¡ojo! nunca se expone o.isCorrect aquí
        })),
      };
    }),
  };
}

function publicSettings(settings) {
  const s = settings || {};
  return {
    askNickname: s.askNickname !== false,
    showCorrectAtEnd: s.showCorrectAtEnd !== false,
    shuffleQuestions: !!s.shuffleQuestions,
    shuffleAnswers: !!s.shuffleAnswers,
    showProgressBar: s.showProgressBar !== false,
    showTimer: s.showTimer !== false,
  };
}
