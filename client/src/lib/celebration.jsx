import { useEffect, useState } from 'react';

/** Generador determinístico simple (mismo layout siempre para la misma semilla). */
export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
export function seededRandom(s) {
  return (hashStr(s) % 1000) / 1000;
}

const BURST_PIECES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 34 + seededRandom(`burst:${i}`) * 26;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
});

/** Explosión de trocitos de color en un punto exacto de la pantalla (al reventar un globo, elegir un tubo, etc). */
export function Burst({ x, y, color }) {
  return (
    <div className="pointer-events-none fixed z-[60]" style={{ left: x, top: y }}>
      {BURST_PIECES.map((p, i) => (
        <span
          key={i}
          className="pop-shard"
          style={{ backgroundColor: color, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` }}
        />
      ))}
    </div>
  );
}

/** Varias explosiones (`Burst`) escalonadas en posiciones aleatorias — celebración de victoria. */
export function WinFireworks() {
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const points = [
      { x: w * 0.22, y: h * 0.3, color: '#ef4444' },
      { x: w * 0.78, y: h * 0.25, color: '#2563eb' },
      { x: w * 0.5, y: h * 0.45, color: '#f59e0b' },
      { x: w * 0.35, y: h * 0.6, color: '#a855f7' },
    ];
    const timers = points.map((p, i) => setTimeout(() => setBursts((b) => [...b, { ...p, id: i }]), i * 380));
    return () => timers.forEach(clearTimeout);
  }, []);

  return bursts.map((b) => <Burst key={b.id} x={b.x} y={b.y} color={b.color} />);
}

const CONFETTI_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#2563eb', '#a855f7', '#ec4899'];
const CONFETTI_PIECES = Array.from({ length: 50 }, (_, i) => ({
  left: seededRandom(`confetti:${i}:l`) * 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  duration: 2.4 + seededRandom(`confetti:${i}:d`) * 2,
  delay: -seededRandom(`confetti:${i}:o`) * 4,
}));

/** Confeti cayendo en toda la pantalla de victoria. */
export function ConfettiLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {CONFETTI_PIECES.map((c, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${c.left}%`,
            backgroundColor: c.color,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
