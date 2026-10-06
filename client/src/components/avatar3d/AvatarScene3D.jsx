import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color } from 'three';
import Studio3D from '../three/Studio3D.jsx';
import { computePositions } from '../../lib/avatarModel.js';

const TARGET_HEIGHT = 1.75;

function colorize(model, look) {
  const palette = [
    new Color(look.skin),
    new Color(look.eyes),
    new Color(look.pants),
    new Color(look.skirtOn ? look.skirt : look.skin),
    new Color(look.hair),
    new Color('#2b1d14'),
  ];
  const out = new Float32Array(model.vertCount * 3);
  for (let v = 0; v < model.vertCount; v++) {
    const c = palette[model.groups[v]] || palette[0];
    out[v * 3] = c.r;
    out[v * 3 + 1] = c.g;
    out[v * 3 + 2] = c.b;
  }
  return out;
}

function Body({ model, params, look, mouthRef }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setIndex(new BufferAttribute(model.indices, 1));
    g.setAttribute('position', new BufferAttribute(new Float32Array(model.base), 3));
    g.setAttribute('color', new BufferAttribute(colorize(model, look), 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // Escala y apoyo en el suelo calculados una sola vez a partir de la malla base.
  const fit = useMemo(() => {
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const h = bb.max.y - bb.min.y;
    const s = TARGET_HEIGHT / h;
    return { s, x: -(bb.min.x + bb.max.x) / 2 * s, y: -bb.min.y * s, z: -(bb.min.z + bb.max.z) / 2 * s };
  }, [geometry]);

  const lastMouth = useRef(-1);
  const posAttr = geometry.getAttribute('position');

  function rebuild(mouth) {
    const pos = computePositions(model, { ...params, mouthOpen: mouth });
    posAttr.array.set(pos);
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
    lastMouth.current = mouth;
  }

  useEffect(() => {
    rebuild(mouthRef?.current ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, model]);

  useEffect(() => {
    geometry.getAttribute('color').array.set(colorize(model, look));
    geometry.getAttribute('color').needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, model]);

  useFrame(() => {
    const m = mouthRef?.current ?? 0;
    if (Math.abs(m - lastMouth.current) > 0.04) rebuild(m);
  });

  return (
    <mesh geometry={geometry} scale={fit.s} position={[fit.x, fit.y, fit.z]} castShadow>
      <meshPhysicalMaterial vertexColors roughness={0.55} clearcoat={0.15} clearcoatRoughness={0.6} />
    </mesh>
  );
}

/**
 * Escena 3D del avatar. `mouthRef.current` (0..1) abre la boca mientras habla.
 * `params` son los rasgos (ver lib/avatarModel.js), `look` colores y fondo.
 */
export default function AvatarScene3D({ model, params, look, mouthRef }) {
  return (
    <Canvas camera={{ position: [0, 1.25, 3.6], fov: 32 }} dpr={[1, 2]}>
      <color attach="background" args={[look.background]} />
      <Studio3D />
      <Body model={model} params={params} look={look} mouthRef={mouthRef} />
    </Canvas>
  );
}
