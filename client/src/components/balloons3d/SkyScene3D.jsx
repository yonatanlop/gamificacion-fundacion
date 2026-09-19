import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Cloud, Environment, Lightformer } from '@react-three/drei';

const CLOUD_LAYOUT = [
  { position: [-14, 7, -20], scale: 3.2, speed: 0.15, opacity: 0.75 },
  { position: [10, 9, -24], scale: 2.1, speed: 0.1, opacity: 0.7 },
  { position: [-4, 4, -18], scale: 3.8, speed: 0.12, opacity: 0.8 },
  { position: [16, 3, -22], scale: 1.6, speed: 0.2, opacity: 0.65 },
  { position: [-18, 1, -16], scale: 2.6, speed: 0.09, opacity: 0.7 },
  { position: [6, -1, -20], scale: 1.9, speed: 0.17, opacity: 0.6 },
];

function DriftingCloud({ position, scale, speed, opacity }) {
  const group = useRef();
  const startX = position[0];

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.x = startX + Math.sin(clock.getElapsedTime() * speed) * 6;
  });

  return (
    <group ref={group} position={position}>
      <Cloud scale={scale} opacity={opacity} speed={0.2} segments={20} />
    </group>
  );
}

/** Cielo, nubes y luces del juego "Globos" — fondo 3D real vía drei/Three.js. */
export default function SkyScene3D() {
  return (
    <>
      <Sky sunPosition={[10, 6, 10]} turbidity={4} rayleigh={1.5} mieCoefficient={0.02} mieDirectionalG={0.85} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 12, 6]} intensity={1.4} color="#fff4dd" />
      <directionalLight position={[-8, 4, -6]} intensity={0.3} color="#bcd7ff" />
      {/* Reflejos de los globos: "estudio" generado en la propia escena (sin
          descargar ninguna imagen externa), en vez del preset HDRI de drei
          que requiere una descarga de red por cada jugador. */}
      <Environment resolution={64}>
        <Lightformer intensity={2} color="#ffffff" position={[0, 6, -10]} scale={[12, 8, 1]} />
        <Lightformer intensity={1} color="#bcd7ff" position={[-10, 2, 4]} rotation={[0, Math.PI / 2, 0]} scale={[8, 6, 1]} />
        <Lightformer intensity={1.2} color="#fff4dd" position={[10, 2, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 6, 1]} />
      </Environment>
      {CLOUD_LAYOUT.map((c, i) => (
        <DriftingCloud key={i} {...c} />
      ))}
    </>
  );
}
