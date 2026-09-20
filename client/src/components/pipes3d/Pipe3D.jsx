/** Un tubo seleccionable: cilindro con un collar más ancho arriba, color por opción. */
export default function Pipe3D({ x, groundY, color, onClick }) {
  const bodyHeight = 2.2;
  const collarHeight = 0.4;

  return (
    <group position={[x, groundY, 0]} onClick={onClick}>
      <mesh position={[0, bodyHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, bodyHeight, 24]} />
        <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, bodyHeight + collarHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.68, 0.68, collarHeight, 24]} />
        <meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0, bodyHeight + collarHeight + 0.015, 0]}>
        <cylinderGeometry args={[0.53, 0.53, 0.03, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
    </group>
  );
}
