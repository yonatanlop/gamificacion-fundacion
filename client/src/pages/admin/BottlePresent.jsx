import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';

const PALETTE = ['#e11d48', '#f97316', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#c026d3'];
const CX = 150;
const CY = 150;
const R = 140;

function pointAt(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) };
}

function sliceGap(startDeg, endDeg) {
  const p1 = pointAt(startDeg, R);
  const p2 = pointAt(endDeg, R);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX},${CY} L ${p1.x},${p1.y} A ${R},${R} 0 ${largeArc},1 ${p2.x},${p2.y} Z`;
}

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
  const [revealed, setRevealed] = useState(false);
  const pendingRef = useRef(null);

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

  const segments = useMemo(() => {
    if (!quiz || !remaining) return [];
    return quiz.questions.filter((q) => remaining.has(q.id));
  }, [quiz, remaining]);

  if (isLoading) return <Shell>Cargando…</Shell>;
  if (isError) return <Shell>{error.message}</Shell>;
  if (quiz.type !== 'BOTTLE') return <Shell>Este juego no es una botella.</Shell>;

  const total = quiz.questions.length;
  const finished = remaining !== null && remaining.size === 0;

  function spin() {
    if (spinning || segments.length === 0) return;
    const idx = Math.floor(Math.random() * segments.length);
    const target = segments[idx];
    const segAngle = 360 / segments.length;
    const segCenter = idx * segAngle + segAngle / 2;
    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const currentMod = ((rotation % 360) + 360) % 360;
    const targetMod = ((360 - segCenter) % 360 + 360) % 360;
    const delta = ((targetMod - currentMod + 360) % 360) + extraSpins * 360;

    setSpinning(true);
    setLanded(null);
    setRevealed(false);
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
    setLanded(quiz.questions.find((q) => q.id === targetId));
  }

  function onWheelTransitionEnd(e) {
    if (e.propertyName !== 'transform' || !pendingRef.current) return;
    resolveSpin(pendingRef.current);
  }

  function spinAgain() {
    if (!landed) return;
    setRemaining((prev) => {
      const next = new Set(prev);
      next.delete(landed.id);
      return next;
    });
    setLanded(null);
    setRevealed(false);
  }

  function restart() {
    setRemaining(new Set(quiz.questions.map((q) => q.id)));
    setLanded(null);
    setRevealed(false);
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
            <div className="relative" style={{ width: 320, height: 320 }}>
              <div
                className="absolute left-1/2 top-[-14px] z-10 h-0 w-0 -translate-x-1/2"
                style={{
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: '22px solid #facc15',
                }}
              />
              <div
                className="h-full w-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 3.8s cubic-bezier(0.15,0.65,0.1,1)' : 'none',
                  transformOrigin: '50% 50%',
                }}
                onTransitionEnd={onWheelTransitionEnd}
              >
                <svg viewBox="0 0 300 300" className="h-full w-full drop-shadow-xl">
                  {segments.map((q, i) => {
                    const segAngle = 360 / segments.length;
                    const start = i * segAngle;
                    const end = start + segAngle;
                    const mid = start + segAngle / 2;
                    const labelPos = pointAt(mid, R * 0.68);
                    return (
                      <g key={q.id}>
                        <path d={sliceGap(start, end)} fill={PALETTE[i % PALETTE.length]} stroke="#0f172a" strokeWidth="2" />
                        <text
                          x={labelPos.x}
                          y={labelPos.y}
                          fill="#fff"
                          fontSize="20"
                          fontWeight="800"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {i + 1}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx={CX} cy={CY} r="22" fill="#0f172a" stroke="#facc15" strokeWidth="3" />
                </svg>
              </div>
            </div>

            <button
              onClick={spin}
              disabled={spinning || segments.length === 0}
              className="rounded-2xl bg-indigo-600 px-10 py-4 text-xl font-extrabold shadow-lg hover:brightness-110 disabled:opacity-50"
            >
              {spinning ? 'Girando…' : 'Girar'}
            </button>
            <p className="text-white/50">{segments.length} pregunta(s) por girar</p>
          </>
        )}
      </div>

      {landed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center text-slate-900">
            <h2 className="mb-6 text-2xl font-extrabold">{landed.text}</h2>
            {landed.image && (
              <img src={landed.image} alt="" className="mx-auto mb-6 max-h-52 rounded-xl object-contain" />
            )}
            {!revealed ? (
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
      )}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-center text-xl text-white">
      {children}
    </div>
  );
}
