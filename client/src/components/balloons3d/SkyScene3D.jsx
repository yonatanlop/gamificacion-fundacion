import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Clouds, Cloud } from '@react-three/drei';
import { BackSide, Color, MeshBasicMaterial } from 'three';
import Studio3D from '../three/Studio3D.jsx';

// Cielo con degradado propio (azul intenso arriba, más claro hacia el
// horizonte) en vez del modelo atmosférico físico de drei/three (`<Sky>`):
// con el tone mapping ACES que usa por defecto React Three Fiber, ese cielo
// físico salía siempre lavado/gris sin importar los parámetros — este
// degradado hecho a mano da control total del color y siempre se ve vívido
// (`toneMapped={false}`).
const SKY_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAGMENT_SHADER = `
  varying vec3 vWorldPosition;
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  void main() {
    float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
  }
`;

function SkyGradient() {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new Color('#1d8fef') },
      bottomColor: { value: new Color('#d6f0ff') },
      offset: { value: 15 },
      exponent: { value: 0.6 },
    }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[400, 32, 15]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={SKY_VERTEX_SHADER}
        fragmentShader={SKY_FRAGMENT_SHADER}
        side={BackSide}
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

function Sun() {
  return (
    <group position={[9, 11, -35]}>
      <mesh>
        <sphereGeometry args={[2.4, 24, 24]} />
        <meshBasicMaterial color="#fff6d8" toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[4.2, 24, 24]} />
        <meshBasicMaterial color="#fff2b8" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

const CLOUD_LAYOUT = [
  { position: [-16, 8, -22], scale: 1.6, speed: 0.15, opacity: 0.45 },
  { position: [11, 10, -26], scale: 1.1, speed: 0.1, opacity: 0.4 },
  { position: [-3, 9, -20], scale: 1.8, speed: 0.12, opacity: 0.45 },
  { position: [18, 6, -24], scale: 0.9, speed: 0.2, opacity: 0.35 },
  { position: [-20, 4, -18], scale: 1.3, speed: 0.09, opacity: 0.4 },
  { position: [6, 3, -22], scale: 1.0, speed: 0.17, opacity: 0.35 },
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
      <Cloud scale={scale} opacity={opacity} color="#ffffff" speed={0.2} segments={8} />
    </group>
  );
}

/** Cielo, nubes y luces del juego "Globos" — fondo 3D real vía drei/Three.js. */
export default function SkyScene3D() {
  return (
    <>
      <SkyGradient />
      <Sun />
      <Studio3D />
      {/* material=MeshBasicMaterial: las nubes no reciben sombreado direccional
          (por defecto usan MeshLambertMaterial, que las oscurece del lado
          contrario a la luz y las hacía ver grises en vez de blancas).
          Agrupar todas bajo un solo <Clouds> también evita cargar la textura
          del CDN una vez por cada nube. */}
      <Clouds material={MeshBasicMaterial}>
        {CLOUD_LAYOUT.map((c, i) => (
          <DriftingCloud key={i} {...c} />
        ))}
      </Clouds>
    </>
  );
}
