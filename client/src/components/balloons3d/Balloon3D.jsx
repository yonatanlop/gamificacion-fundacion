import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/** Un globo individual: cuerpo esférico con material físico (brillo de látex real),
 * nudo, hilo que se balancea y ascenso en bucle — reemplaza al `.balloon` de CSS.
 * La posición horizontal y el recorrido vertical se calculan a partir del
 * `viewport` real de la cámara (no de constantes fijas) para que los globos
 * de los extremos nunca queden fuera de cámara en pantallas angostas (el
 * mismo bug de "globo cortado" que ya se corrigió en la versión CSS). */
export default function Balloon3D({ layout, question, onPop }) {
  const { viewport } = useThree();
  const group = useRef();
  const stringPivot = useRef();
  const [reacting, setReacting] = useState(false);
  const reactStart = useRef(0);
  const frameElapsed = useRef(0);

  const color = question.balloonColor || '#ef4444';
  const x = (layout.left / 100 - 0.5) * viewport.width;
  const halfHeight = viewport.height / 2;
  const bottomY = -halfHeight - 2;
  const topY = halfHeight + 2;
  const offset = -layout.delay; // segundos ya avanzados dentro del ciclo (mismo truco que el "delay negativo" de CSS)
  const travel = topY - bottomY;
  const swayAmplitude = Math.min(0.4, viewport.width * 0.015);
  const swayPhase = Math.sin(x * 13.37) * Math.PI;

  useFrame(({ clock }) => {
    if (!group.current) return;
    const elapsed = clock.getElapsedTime();
    frameElapsed.current = elapsed;
    const t = elapsed + offset;
    const phase = (t % layout.duration) / layout.duration;
    group.current.position.y = bottomY + travel * phase;
    group.current.position.x = x + Math.sin(t * 1.3 + swayPhase) * swayAmplitude;
    group.current.rotation.z = Math.sin(t * 1.8 + swayPhase) * 0.12;
    if (stringPivot.current) {
      stringPivot.current.rotation.z = Math.sin(t * 2.4 + swayPhase) * 0.35;
    }

    if (reacting) {
      const since = elapsed - reactStart.current;
      const pulse = since < 0.12 ? 1 - since / 0.12 : 0;
      const s = 1 - pulse * 0.22;
      group.current.scale.setScalar(s);
      if (since > 0.12) setReacting(false);
    }
  });

  function handleClick(e) {
    e.stopPropagation();
    reactStart.current = frameElapsed.current;
    setReacting(true);
    onPop?.(question, e.nativeEvent.clientX, e.nativeEvent.clientY);
  }

  return (
    <group ref={group} position={[x, bottomY, 0]}>
      <mesh onClick={handleClick} castShadow scale={[1, 1.15, 1]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} metalness={0.05} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[0, -1.18, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.13, 0.22, 16]} />
        <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} />
      </mesh>
      <group ref={stringPivot} position={[0, -1.3, 0]}>
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.4, 6]} />
          <meshStandardMaterial color="#f3f4f6" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
