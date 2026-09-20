import { Canvas, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import Studio3D from '../three/Studio3D.jsx';
import Pipe3D from './Pipe3D.jsx';
import Explorer3D from './Explorer3D.jsx';

// Altura del suelo fija (no derivada del viewport): a diferencia de la
// posición horizontal —que sí debe adaptarse al ancho real de pantalla para
// no recortar tubos en los bordes—, la composición vertical (qué tan alto se
// ve el tubo respecto al personaje) es una decisión de arte que se mantiene
// igual sin importar la relación de aspecto.
const GROUND_Y = -1.6;

function Ground() {
  return (
    <mesh position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 40]} />
      <meshStandardMaterial color="#4ade80" roughness={0.9} />
    </mesh>
  );
}

function PipesField({ options, phase, targetX, onPick }) {
  const { viewport } = useThree();
  const groundY = GROUND_Y;
  const count = options.length;

  return (
    <>
      <Ground />
      {options.map((o, i) => {
        const x = ((i + 0.5) / count - 0.5) * viewport.width * 0.75;
        return (
          <Pipe3D
            key={o.id}
            x={x}
            groundY={groundY}
            color={o.color || '#22c55e'}
            onClick={(e) => {
              e.stopPropagation();
              onPick(o.id, x);
            }}
          />
        );
      })}
      <Explorer3D groundY={groundY} targetX={targetX == null ? 0 : targetX} phase={phase} />
    </>
  );
}

/** Escena 3D de "Tuberías": cielo, terreno y tubos seleccionables por pregunta. */
export default function PipesScene3D({ options, phase, targetX, onPick }) {
  return (
    <Canvas camera={{ position: [0, 0.2, 7], fov: 45 }} dpr={[1, 2]} shadows>
      <Sky sunPosition={[10, 8, 10]} turbidity={3} rayleigh={1.2} mieCoefficient={0.02} mieDirectionalG={0.85} />
      <Studio3D />
      <PipesField options={options} phase={phase} targetX={targetX} onPick={onPick} />
    </Canvas>
  );
}
