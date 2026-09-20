import { Environment, Lightformer } from '@react-three/drei';

/**
 * Iluminación + reflejos compartidos por todas las escenas 3D del proyecto:
 * luz ambiente + 2 direccionales, más un "estudio" de reflejos generado en la
 * propia escena (nunca un preset HDRI de drei, que descarga una imagen de un
 * CDN externo en cada partida — eso causó un cuelgue real en "Globos"; ver
 * memoria del proyecto).
 */
export default function Studio3D() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 12, 6]} intensity={1.4} color="#fff4dd" />
      <directionalLight position={[-8, 4, -6]} intensity={0.3} color="#bcd7ff" />
      <Environment resolution={64}>
        <Lightformer intensity={2} color="#ffffff" position={[0, 6, -10]} scale={[12, 8, 1]} />
        <Lightformer intensity={1} color="#bcd7ff" position={[-10, 2, 4]} rotation={[0, Math.PI / 2, 0]} scale={[8, 6, 1]} />
        <Lightformer intensity={1.2} color="#fff4dd" position={[10, 2, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[8, 6, 1]} />
      </Environment>
    </>
  );
}
