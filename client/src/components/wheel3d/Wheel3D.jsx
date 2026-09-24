import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createNumberTexture } from './numberTexture.js';

const PALETTE = ['#e11d48', '#f97316', '#d97706', '#16a34a', '#0d9488', '#2563eb', '#7c3aed', '#c026d3'];
const RADIUS = 3.4;
const DEPTH = 0.5;
const SPIN_DURATION = 3.8; // igual que la transición CSS que reemplaza
// El gajo "de referencia" (ángulo lógico 0, el mismo que usa spin() en
// BottlePresent.jsx para calcular a qué rotación hay que llegar) apunta al
// lado lejano del disco, donde vive el puntero fijo — así el marcador queda
// bien visible desde la cámara elevada en vez de tapado cerca del borde
// frontal.
const POINTER_OFFSET = Math.PI;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

const ANSWERED_COLOR = '#334155';

function Slice({ index, count, color, answered }) {
  const sliceAngle = (Math.PI * 2) / count;
  const thetaStart = POINTER_OFFSET + index * sliceAngle;
  const mid = thetaStart + sliceAngle / 2;
  const labelR = RADIUS * 0.62;
  // Misma fórmula que usa CylinderGeometry internamente (x=sin·r, z=cos·r)
  // para que la etiqueta caiga exactamente sobre su propio gajo.
  const lx = Math.sin(mid) * labelR;
  const lz = Math.cos(mid) * labelR;
  const texture = useMemo(() => createNumberTexture(index + 1), [index]);
  // Las preguntas ya respondidas se quedan en su lugar (el disco no se
  // achica) pero se marcan en gris y un poco hundidas, para que el profesor
  // vea de un vistazo cuáles ya salieron sin que la rueda "pierda" gajos.
  const depth = answered ? DEPTH * 0.55 : DEPTH;

  return (
    <group>
      <mesh position={[0, -(DEPTH - depth) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[RADIUS, RADIUS, depth, 48, 1, false, thetaStart, sliceAngle]} />
        <meshPhysicalMaterial
          color={answered ? ANSWERED_COLOR : color}
          roughness={answered ? 0.9 : 0.45}
          clearcoat={answered ? 0.1 : 0.5}
          clearcoatRoughness={0.35}
        />
      </mesh>
      <mesh position={[lx, depth - DEPTH / 2 + 0.01, lz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={texture} transparent opacity={answered ? 0.55 : 1} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Disco 3D de la ruleta: gira animado con `useFrame` (calcula el ángulo a
 * partir del tiempo transcurrido real, no de un evento del DOM) hacia
 * `targetRotation` (grados) — mismo valor que ya calculaba `spin()` en
 * BottlePresent.jsx, sin cambios ahí. Llama `onSpinDone()` una sola vez al
 * terminar.
 */
export default function Wheel3D({ segments, remaining, targetRotation, spinning, onSpinDone }) {
  const group = useRef();
  const currentDeg = useRef(targetRotation || 0);
  const anim = useRef({ from: 0, to: 0, start: null, active: false, doneCalled: false });

  useEffect(() => {
    if (spinning) {
      anim.current = { from: currentDeg.current, to: targetRotation, start: null, active: true, doneCalled: false };
    }
  }, [spinning, targetRotation]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const a = anim.current;
    if (a.active) {
      if (a.start === null) a.start = clock.getElapsedTime();
      const t = Math.min(1, (clock.getElapsedTime() - a.start) / SPIN_DURATION);
      currentDeg.current = a.from + (a.to - a.from) * easeOutCubic(t);
      if (t >= 1) {
        a.active = false;
        if (!a.doneCalled) {
          a.doneCalled = true;
          onSpinDone?.();
        }
      }
    }
    // Signo POSITIVO a propósito: con la geometría de este disco (x=sin·r,
    // z=cos·r, gajo 0 desde el puntero) la posición angular de un gajo tras
    // rotar es `theta + rotation.y`, así que `targetRotation` (calculado por
    // spin() como -centroDelGajo) deja el gajo elegido justo bajo el puntero.
    // Con el signo negativo señalaba un gajo equivocado ~80% de las veces
    // (verificado con una simulación de 200 giros: 41/200 vs 200/200).
    group.current.rotation.y = (currentDeg.current * Math.PI) / 180;
  });

  const count = segments.length;
  if (count === 0) return null;

  return (
    <>
      <group ref={group}>
        {segments.map((seg, i) => (
          <Slice
            key={seg.id}
            index={i}
            count={count}
            color={PALETTE[i % PALETTE.length]}
            answered={!!remaining && !remaining.has(seg.id)}
          />
        ))}
        <mesh position={[0, DEPTH / 2 + 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.16, 32]} />
          <meshPhysicalMaterial color="#0f172a" roughness={0.3} clearcoat={0.8} />
        </mesh>
        <mesh position={[0, DEPTH / 2 + 0.11, 0]}>
          <torusGeometry args={[0.55, 0.045, 12, 32]} />
          <meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Puntero fijo: no gira con el disco. */}
      <mesh position={[0, DEPTH + 0.75, -(RADIUS + 0.35)]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.32, 0.7, 4]} />
        <meshStandardMaterial color="#facc15" metalness={0.4} roughness={0.3} />
      </mesh>
    </>
  );
}
