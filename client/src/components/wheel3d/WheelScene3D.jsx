import { Canvas } from '@react-three/fiber';
import Studio3D from '../three/Studio3D.jsx';
import Wheel3D from './Wheel3D.jsx';

function Table() {
  return (
    <mesh position={[0, -0.26, 0]} receiveShadow>
      <cylinderGeometry args={[5.2, 5.4, 0.1, 48]} />
      <meshStandardMaterial color="#1e293b" roughness={0.85} />
    </mesh>
  );
}

/** Escena 3D de la ruleta de "Botella": disco giratorio sobre una base, visto desde una cámara elevada. */
export default function WheelScene3D({ segments, remaining, targetRotation, spinning, onSpinDone }) {
  return (
    <Canvas camera={{ position: [0, 7.5, 8.5], fov: 42 }} dpr={[1, 2]} shadows>
      <Studio3D />
      <Table />
      <Wheel3D
        segments={segments}
        remaining={remaining}
        targetRotation={targetRotation}
        spinning={spinning}
        onSpinDone={onSpinDone}
      />
    </Canvas>
  );
}
