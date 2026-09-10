import { describe, it, expect } from 'vitest';
import { scoreAnswer } from '../src/services/scoring.js';

const base = {
  type: 'SINGLE',
  correctOptionIds: ['a'],
  timeLimit: 30,
  points: 1000,
  pointsMode: 'STANDARD',
};

describe('scoreAnswer', () => {
  it('respuesta instantánea correcta => puntaje completo', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: ['a'], timeMs: 0 });
    expect(r).toEqual({ isCorrect: true, pointsAwarded: 1000 });
  });

  it('respuesta correcta justo en el límite => mitad del puntaje', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: ['a'], timeMs: 30_000 });
    expect(r.isCorrect).toBe(true);
    expect(r.pointsAwarded).toBe(500);
  });

  it('respuesta correcta a mitad de tiempo => 75% del puntaje', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: ['a'], timeMs: 15_000 });
    expect(r.pointsAwarded).toBe(750);
  });

  it('nunca baja del piso aunque se pase del tiempo', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: ['a'], timeMs: 999_999 });
    expect(r.pointsAwarded).toBe(500);
  });

  it('respuesta incorrecta => 0', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: ['b'], timeMs: 0 });
    expect(r).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it('sin selección => incorrecta', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: [], timeMs: 0 });
    expect(r.isCorrect).toBe(false);
  });

  it('pointsMode DOUBLE duplica', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: ['a'], timeMs: 0, pointsMode: 'DOUBLE' });
    expect(r.pointsAwarded).toBe(2000);
  });

  it('pointsMode ZERO no otorga puntos aunque sea correcta', () => {
    const r = scoreAnswer({ ...base, selectedOptionIds: ['a'], timeMs: 0, pointsMode: 'ZERO' });
    expect(r).toEqual({ isCorrect: true, pointsAwarded: 0 });
  });

  describe('MULTIPLE', () => {
    const m = { ...base, type: 'MULTIPLE', correctOptionIds: ['a', 'c'] };
    it('acierta solo si el conjunto es exacto', () => {
      expect(scoreAnswer({ ...m, selectedOptionIds: ['a', 'c'], timeMs: 0 }).isCorrect).toBe(true);
      expect(scoreAnswer({ ...m, selectedOptionIds: ['a'], timeMs: 0 }).isCorrect).toBe(false);
      expect(scoreAnswer({ ...m, selectedOptionIds: ['a', 'c', 'b'], timeMs: 0 }).isCorrect).toBe(false);
    });
  });
});
