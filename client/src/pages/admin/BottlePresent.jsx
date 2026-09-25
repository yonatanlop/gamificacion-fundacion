import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { isWebglAvailable } from '../../lib/webgl.js';

const WheelScene3D = lazy(() => import('../../components/wheel3d/WheelScene3D.jsx'));

/**
 * Ruleta de preguntas para presentar en clase. Sin sesión de jugador ni
 * puntaje — el estado de qué preguntas ya se giraron vive solo en memoria
 * de esta pantalla (igual que el "step" de SurveyPresent.jsx).
 */
export default function BottlePresent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => api.authGet(`/quizzes/${id}`),
  });
  const quiz = data?.quiz;

  const [remaining, setRemaining] = useState(null); // Set de ids aún no girados
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(null);
  const [revealed, setRevealed] = useState(false); // modo simple (pregunta sin respuesta falsa)
  // Modo con dos respuestas: [incorrecta, correcta] en ORDEN DE APARICIÓN (primero sale la
  // incorrecta, con el siguiente clic la correcta), cada una con el `slot` (0 izquierda /
  // 1 derecha, letra A/B) donde se dibuja — el slot es aleatorio para que la correcta no
  // esté siempre en el mismo lado. null = pregunta sin respuesta falsa (modo simple).
  const [answers, setAnswers] = useState(null);
  const [shown, setShown] = useState(0); // cuántas respuestas ya se mostraron (0, 1 o 2)
  const [wrongTried, setWrongTried] = useState(false); // el profesor ya señaló la incorrecta
  const [verdict, setVerdict] = useState(null); // null | 'correct' (eligió la correcta) | 'reveal' (solo se reveló)
  const pendingRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (quiz && remaining === null) setRemaining(new Set(quiz.questions.map((q) => q.id)));
  }, [quiz, remaining]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate(`/admin/quizzes/${id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, navigate]);

  // El disco siempre muestra TODAS las preguntas en posiciones fijas (no se
  // achica al responder) — solo cambia qué gajos aparecen marcados como ya
  // respondidos. El sorteo elige únicamente entre las que faltan.
  const segments = quiz?.questions || [];
  const webglOk = useMemo(() => isWebglAvailable(), []);

  if (isLoading) return <Shell>Cargando…</Shell>;
  if (isError) return <Shell>{error.message}</Shell>;
  if (quiz.type !== 'BOTTLE') return <Shell>Este juego no es una botella.</Shell>;

  const total = quiz.questions.length;
  const finished = remaining !== null && remaining.size === 0;

  function spin() {
    if (spinning || !remaining || remaining.size === 0) return;
    const pickable = quiz.questions.filter((q) => remaining.has(q.id));
    const target = pickable[Math.floor(Math.random() * pickable.length)];
    const idx = quiz.questions.findIndex((q) => q.id === target.id); // posición fija del gajo en el disco completo
    const total = quiz.questions.length;
    const segAngle = 360 / total;
    const segCenter = idx * segAngle + segAngle / 2;
    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const currentMod = ((rotation % 360) + 360) % 360;
    const targetMod = ((360 - segCenter) % 360 + 360) % 360;
    const delta = ((targetMod - currentMod + 360) % 360) + extraSpins * 360;

    setSpinning(true);
    setLanded(null);
    resetReveal();
    pendingRef.current = target.id;
    setRotation((r) => r + delta);
    // Respaldo por si `transitionend` no dispara (pestaña en segundo plano,
    // u otra causa del navegador) — así la ruleta nunca queda trabada en
    // "Girando…" sin forma de continuar.
    setTimeout(() => resolveSpin(target.id), 4200);
  }

  function resolveSpin(targetId) {
    if (pendingRef.current !== targetId) return; // ya resuelto por el otro camino, o es un giro viejo
    pendingRef.current = null;
    setSpinning(false);
    const q = quiz.questions.find((x) => x.id === targetId);
    resetReveal();
    if (q.wrongAnswerText) {
      const correctSlot = Math.random() < 0.5 ? 0 : 1;
      setAnswers([
        { text: q.wrongAnswerText, correct: false, slot: 1 - correctSlot },
        { text: q.answerText, correct: true, slot: correctSlot },
      ]);
    }
    setLanded(q);
  }

  function resetReveal() {
    clearTimeout(closeTimerRef.current);
    setRevealed(false);
    setAnswers(null);
    setShown(0);
    setWrongTried(false);
    setVerdict(null);
  }

  // Marca la pregunta como ya salida y vuelve a la ruleta.
  function closeQuestion(questionId) {
    setRemaining((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
    setLanded(null);
    resetReveal();
  }

  function spinAgain() {
    if (landed) closeQuestion(landed.id);
  }

  // El profesor hizo clic en una de las dos respuestas.
  function pickAnswer(answer) {
    if (answer.correct) {
      const id = landed.id;
      setVerdict('correct');
      // Muestra "¡Correcta!" un momento y cierra sola la pregunta (también hay
      // un botón "Continuar" por si se quiere avanzar antes).
      closeTimerRef.current = setTimeout(() => closeQuestion(id), 2200);
    } else {
      setWrongTried(true);
    }
  }

  function restart() {
    setRemaining(new Set(quiz.questions.map((q) => q.id)));
    setLanded(null);
    resetReveal();
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900 text-white">
      <div className="flex items-center gap-4 border-b border-white/10 px-6 py-3 text-sm">
        <span className="font-bold text-white/70">{quiz.title}</span>
        <span className="rounded-full bg-white/10 px-3 py-1 font-bold">
          {remaining ? total - remaining.size : 0} / {total} preguntas giradas
        </span>
        <button
          onClick={() => navigate(`/admin/quizzes/${id}`)}
          className="ml-auto rounded bg-white/10 px-3 py-1 hover:bg-white/20"
        >
          Salir ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        {finished ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-extrabold">
              {quiz.settings.closingMessage || '¡Repasamos todas las preguntas!'}
            </h2>
            <button
              onClick={restart}
              className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-extrabold hover:brightness-110"
            >
              Reiniciar ruleta
            </button>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-xl" style={{ height: 380 }}>
              {webglOk ? (
                <Suspense fallback={<div className="absolute inset-0" />}>
                  <div className="absolute inset-0">
                    <WheelScene3D
                      segments={segments}
                      remaining={remaining}
                      targetRotation={rotation}
                      spinning={spinning}
                      onSpinDone={() => resolveSpin(pendingRef.current)}
                    />
                  </div>
                </Suspense>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-lg font-semibold">
                  Tu navegador no soporta gráficos 3D. Por favor abre esta pantalla desde otro navegador o
                  dispositivo actualizado.
                </div>
              )}
            </div>

            <button
              onClick={spin}
              disabled={spinning || !remaining || remaining.size === 0}
              className="rounded-2xl bg-indigo-600 px-10 py-4 text-xl font-extrabold shadow-lg hover:brightness-110 disabled:opacity-50"
            >
              {spinning ? 'Girando…' : 'Girar'}
            </button>
            <p className="text-white/50">{remaining ? remaining.size : 0} pregunta(s) por girar</p>
          </>
        )}
      </div>

      {landed && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center text-slate-900">
              <h2 className="mb-6 text-2xl font-extrabold">{landed.text}</h2>
              {landed.image && (
                <img src={landed.image} alt="" className="mx-auto mb-6 max-h-52 rounded-xl object-contain" />
              )}
              {answers ? (
                <div className="space-y-5">
                  {shown > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[0, 1].map((slot) => {
                        const idx = answers.findIndex((a) => a.slot === slot);
                        const a = answers[idx];
                        if (idx >= shown) {
                          // Hueco de la respuesta que aún no aparece.
                          return (
                            <div
                              key={slot}
                              className="flex items-center justify-center rounded-2xl border-4 border-dashed border-slate-200 p-5 text-4xl font-extrabold text-slate-300"
                            >
                              ?
                            </div>
                          );
                        }
                        return (
                          <AnswerCard
                            key={slot}
                            letter={slot === 0 ? 'A' : 'B'}
                            answer={a}
                            status={cardStatus(a, wrongTried, verdict)}
                            clickable={shown === 2 && verdict === null && (a.correct || !wrongTried)}
                            onClick={() => pickAnswer(a)}
                            solved={verdict}
                          />
                        );
                      })}
                    </div>
                  )}

                  {verdict === null && shown < 2 && (
                    <button
                      onClick={() => setShown((n) => n + 1)}
                      className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-extrabold text-white hover:brightness-110"
                    >
                      {shown === 0 ? 'Ver respuestas' : 'Mostrar la otra respuesta'}
                    </button>
                  )}

                  {verdict === null && shown === 2 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-500">
                        {wrongTried
                          ? 'Esa no era — haz clic en la otra respuesta'
                          : 'Haz clic en la respuesta que señalen los estudiantes'}
                      </p>
                      <button
                        onClick={() => setVerdict('reveal')}
                        className="text-sm text-slate-400 underline hover:text-slate-600"
                      >
                        Revelar la correcta sin elegir
                      </button>
                    </div>
                  )}

                  {verdict !== null && (
                    <button
                      onClick={spinAgain}
                      className="rounded-xl bg-green-600 px-8 py-3 text-lg font-extrabold text-white hover:brightness-110"
                    >
                      Continuar
                    </button>
                  )}
                </div>
              ) : !revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="rounded-xl bg-indigo-600 px-8 py-3 text-lg font-extrabold text-white hover:brightness-110"
                >
                  Ver respuesta
                </button>
              ) : (
                <div className="space-y-5">
                  <p className="rounded-xl bg-indigo-50 p-4 text-lg font-semibold text-indigo-900">{landed.answerText}</p>
                  <button
                    onClick={spinAgain}
                    className="rounded-xl bg-green-600 px-8 py-3 text-lg font-extrabold text-white hover:brightness-110"
                  >
                    Girar de nuevo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Estado visual de una tarjeta:
 *  - neutral: todavía sin elegir.
 *  - wrong: la incorrecta ya señalada (roja ✗).
 *  - correct: la correcta, ya elegida o revelada (verde ✓).
 *  - dim: la incorrecta que queda atenuada cuando ya se resolvió la pregunta.
 */
function cardStatus(answer, wrongTried, verdict) {
  if (answer.correct) return verdict !== null ? 'correct' : 'neutral';
  if (verdict !== null) return wrongTried ? 'wrong' : 'dim';
  return wrongTried ? 'wrong' : 'neutral';
}

const CARD_STYLE = {
  neutral: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  correct: 'border-green-500 bg-green-100 text-green-900',
  wrong: 'border-red-500 bg-red-100 text-red-900',
  dim: 'border-slate-200 bg-slate-100 text-slate-400',
};

function AnswerCard({ letter, answer, status, clickable, onClick, solved }) {
  const verdictText =
    status === 'wrong'
      ? '✗ Incorrecta'
      : status === 'correct'
        ? solved === 'correct'
          ? '✓ ¡Correcto!'
          : '✓ Esta es la correcta'
        : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`flex flex-col items-center gap-2 rounded-2xl border-4 p-5 text-lg font-semibold transition ${
        CARD_STYLE[status]
      } ${clickable ? 'cursor-pointer hover:scale-[1.02] hover:border-indigo-500 hover:shadow-lg' : 'cursor-default'}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-lg font-extrabold">
        {letter}
      </span>
      <span>{answer.text}</span>
      {verdictText && <span className="text-xl font-extrabold">{verdictText}</span>}
    </button>
  );
}

function Shell({ children }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-center text-xl text-white">
      {children}
    </div>
  );
}
