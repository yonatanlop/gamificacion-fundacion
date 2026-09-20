import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Cloud } from '@react-three/drei';
import Studio3D from '../three/Studio3D.jsx';

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
      <Studio3D />
      {CLOUD_LAYOUT.map((c, i) => (
        <DriftingCloud key={i} {...c} />
      ))}
    </>
  );
}
