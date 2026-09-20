import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Personaje genérico (formas simples, sin marca): permanece al centro con un
 * ligero balanceo; al acertar camina hacia el tubo elegido y se hunde
 * (entra); al fallar (tubo equivocado o se acabó el oxígeno) se sacude y
 * vuelve al centro.
 */
const REST_Y = 0.54; // altura del centro del personaje sobre el suelo (mitad de su cápsula)
const REST_Z = 1.4; // qué tan adelante del tubo se para (evita que se vea "metido" en él)

export default function Explorer3D({ groundY, targetX = 0, phase = 'idle' }) {
  const group = useRef();
  const bodyRef = useRef();
  const frameElapsed = useRef(0);
  const phaseStart = useRef(0);
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (prevPhase.current !== phase) {
      phaseStart.current = frameElapsed.current;
      prevPhase.current = phase;
    }
  }, [phase]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const elapsed = clock.getElapsedTime();
    frameElapsed.current = elapsed;
    const since = elapsed - phaseStart.current;

    const bob = Math.sin(elapsed * 3) * 0.05;
    let x = group.current.position.x;
    let y = groundY + REST_Y + bob;
    let scale = 1;

    if (phase === 'walking') {
      x = THREE.MathUtils.lerp(x, targetX, 0.08);
    } else if (phase === 'correct') {
      if (since < 0.5) {
        x = THREE.MathUtils.lerp(x, targetX, 0.12);
      } else {
        x = targetX;
        const shrink = Math.min(1, (since - 0.5) / 0.4);
        scale = 1 - shrink;
        y = groundY + REST_Y * (1 - shrink) + bob * (1 - shrink);
      }
    } else if (phase === 'wrong') {
      const shake = since < 0.5 ? Math.sin(since * 40) * 0.18 * (1 - since / 0.5) : 0;
      x = THREE.MathUtils.lerp(x, 0, 0.15) + shake;
    } else {
      x = THREE.MathUtils.lerp(x, 0, 0.1);
    }

    group.current.position.set(x, y, REST_Z);
    group.current.scale.setScalar(Math.max(0, scale));
  });

  return (
    <group ref={group} position={[0, groundY + REST_Y, REST_Z]}>
      <mesh ref={bodyRef} castShadow>
        <capsuleGeometry args={[0.32, 0.4, 8, 16]} />
        <meshPhysicalMaterial color="#f97316" roughness={0.4} clearcoat={0.5} />
      </mesh>
      <mesh position={[-0.13, 0.24, 0.28]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.13, 0.24, 0.28]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}
