import { Canvas } from '@react-three/fiber';
import SkyScene3D from './SkyScene3D.jsx';
import Balloon3D from './Balloon3D.jsx';

/** Escena 3D completa de la fase de juego de "Globos": cielo, nubes y globos reales en WebGL. */
export default function BalloonScene3D({ balloons, onPop }) {
  return (
    <Canvas camera={{ position: [0, 1, 16], fov: 50 }} dpr={[1, 2]}>
      <SkyScene3D />
      {balloons.map(({ layout, question }) => (
        <Balloon3D key={layout.id} layout={layout} question={question} onPop={onPop} />
      ))}
    </Canvas>
  );
}
