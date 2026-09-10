/**
 * Puntaje con bonificación por rapidez, calculado SIEMPRE en el servidor.
 *
 * Reglas:
 *  - Respuesta incorrecta => 0 puntos.
 *  - Respuesta correcta   => points * (1 - (ratioTiempo / 2)), con piso en points/2.
 *      ratioTiempo = timeMs / (timeLimit * 1000), acotado a [0, 1].
 *  - pointsMode DOUBLE => x2 ;  ZERO => 0 (la pregunta no otorga puntos).
 */

/**
 * @param {object} params
 * @param {'SINGLE'|'MULTIPLE'|'TRUE_FALSE'} params.type
 * @param {string[]} params.correctOptionIds
 * @param {string[]} params.selectedOptionIds
 * @param {number} params.timeMs        tiempo que tardó el jugador en responder
 * @param {number} params.timeLimit     límite en segundos de la pregunta
 * @param {number} params.points        puntaje base
 * @param {'STANDARD'|'DOUBLE'|'ZERO'} params.pointsMode
 * @returns {{ isCorrect: boolean, pointsAwarded: number }}
 */
export function scoreAnswer({
  type,
  correctOptionIds,
  selectedOptionIds,
  timeMs,
  timeLimit,
  points,
  pointsMode = 'STANDARD',
}) {
  const selected = new Set((selectedOptionIds || []).filter(Boolean));
  const correct = new Set((correctOptionIds || []).filter(Boolean));

  let isCorrect;
  if (type === 'MULTIPLE') {
    isCorrect =
      selected.size > 0 &&
      selected.size === correct.size &&
      [...selected].every((id) => correct.has(id));
  } else {
    // SINGLE / TRUE_FALSE: exactamente una opción y debe ser correcta
    isCorrect = selected.size === 1 && correct.has([...selected][0]);
  }

  if (!isCorrect || pointsMode === 'ZERO') {
    return { isCorrect, pointsAwarded: 0 };
  }

  const safeTime = Math.max(0, Number(timeMs) || 0);
  const totalMs = Math.max(1, (Number(timeLimit) || 30) * 1000);
  const ratio = Math.min(1, safeTime / totalMs);
  const factor = 1 - ratio / 2; // 1.0 (instantáneo) .. 0.5 (al límite)

  let awarded = Math.round((Number(points) || 0) * factor);
  if (pointsMode === 'DOUBLE') awarded *= 2;

  return { isCorrect, pointsAwarded: awarded };
}
