import { describe, it, expect } from 'vitest';
import { toPublicQuiz } from '../src/services/sanitize.js';

const quiz = {
  id: 'q1',
  slug: 'demo',
  title: 'Demo',
  description: null,
  coverImage: null,
  theme: {},
  settings: { askNickname: true },
  questions: [
    {
      id: 'qq1',
      order: 0,
      type: 'TRUE_FALSE',
      text: '¿Cierto?',
      image: null,
      mediaType: 'none',
      timeLimit: 30,
      points: 1000,
      pointsMode: 'STANDARD',
      options: [
        { id: 'o1', order: 0, text: 'Verdadero', image: null, color: null, isCorrect: true },
        { id: 'o2', order: 1, text: 'Falso', image: null, color: null, isCorrect: false },
      ],
    },
  ],
};

describe('toPublicQuiz', () => {
  it('no expone isCorrect en ninguna opción', () => {
    const pub = toPublicQuiz(quiz, { seed: 'x' });
    const json = JSON.stringify(pub);
    expect(json).not.toMatch(/isCorrect/);
    for (const q of pub.questions) {
      for (const o of q.options) {
        expect(o).not.toHaveProperty('isCorrect');
      }
    }
  });

  it('mantiene el conteo de preguntas y opciones', () => {
    const pub = toPublicQuiz(quiz, { seed: 'x' });
    expect(pub.questionCount).toBe(1);
    expect(pub.questions[0].options).toHaveLength(2);
  });

  it('el barajado con la misma semilla es estable', () => {
    const a = toPublicQuiz(quiz, { seed: 'same', shuffleAnswers: true });
    const b = toPublicQuiz(quiz, { seed: 'same', shuffleAnswers: true });
    expect(a.questions[0].options.map((o) => o.id)).toEqual(b.questions[0].options.map((o) => o.id));
  });
});
