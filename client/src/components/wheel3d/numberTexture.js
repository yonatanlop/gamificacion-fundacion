import { CanvasTexture } from 'three';

const cache = new Map();

/** Textura con un número dibujado en un <canvas> 2D del navegador (fuente del
 * sistema, sin descargar ninguna fuente externa) — usada como etiqueta sobre
 * cada gajo de la ruleta 3D. */
export function createNumberTexture(n) {
  const key = String(n);
  if (cache.has(key)) return cache.get(key);

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(size * 0.58)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.06;
  ctx.fillText(key, size / 2, size / 2 + size * 0.02);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}
