import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asyncHandler, HttpError } from '../middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '../../assets/icons');

const manifest = JSON.parse(fs.readFileSync(path.join(ICONS_DIR, 'manifest.json'), 'utf8'));
const byId = new Map(manifest.icons.map((i) => [i.id, i]));

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function clamp(value, min, max, isFloat = false) {
  const n = isFloat ? parseFloat(value) : parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

/** Aplica color / grosor de línea / tamaño reescribiendo solo la etiqueta raíz <svg ...>. */
function applyParams(svg, query) {
  const end = svg.indexOf('>');
  if (end === -1) return svg;
  let openTag = svg.slice(0, end);
  const rest = svg.slice(end);

  const size = clamp(query.size, 8, 512);
  const stroke = clamp(query.stroke, 0.25, 4, true);
  const color = HEX_COLOR.test(query.color || '') ? query.color : null;

  if (size) {
    openTag = openTag.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '');
    openTag = openTag.replace('<svg', `<svg width="${size}" height="${size}"`);
  }
  if (stroke && /stroke-width="[^"]*"/.test(openTag)) {
    openTag = openTag.replace(/stroke-width="[^"]*"/, `stroke-width="${stroke}"`);
  }
  if (color) {
    openTag = openTag.replace(/\sstyle="[^"]*"/, '');
    openTag = openTag.replace('<svg', `<svg style="color:${color}"`);
  }
  return openTag + rest;
}

/**
 * Para íconos a color fijo (Fluent Emoji, Noto), que no usan currentColor:
 * - mono: convierte el ícono en una silueta plana de un solo color, usando su
 *   propia forma (alfa) como máscara.
 * - hue: gira toda la paleta (feColorMatrix hueRotate), conservando sombras y
 *   brillos relativos — no hace falta saber los colores originales.
 * Ambos quedan "horneados" dentro del SVG, así que también se ven al descargar
 * el archivo, no solo en la vista previa.
 */
function applyColorEffects(svg, query) {
  const mono = HEX_COLOR.test(query.mono || '') ? query.mono : null;
  const hue = mono ? null : clamp(query.hue, 0, 360);
  if (!mono && !hue) return svg;

  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = vb ? vb[1] : 24;
  const h = vb ? vb[2] : 24;
  const openEnd = svg.indexOf('>') + 1;
  const closeStart = svg.lastIndexOf('</svg>');
  if (openEnd <= 0 || closeStart < 0) return svg;
  const openTag = svg.slice(0, openEnd);
  const body = svg.slice(openEnd, closeStart);

  if (mono) {
    return (
      `${openTag}<defs><mask id="mono" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}" ` +
      `style="mask-type:alpha">${body}</mask></defs>` +
      `<rect x="0" y="0" width="${w}" height="${h}" fill="${mono}" mask="url(#mono)"/></svg>`
    );
  }
  return `${openTag}<defs><filter id="hue"><feColorMatrix type="hueRotate" values="${hue}"/></filter></defs><g filter="url(#hue)">${body}</g></svg>`;
}

// GET /api/icons/manifest — índice para el buscador del picker (público, sin datos sensibles).
export const iconsApiRouter = Router();
iconsApiRouter.get('/manifest', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(manifest);
});

// GET /icons/:set/:name.svg?color=&stroke=&size=&hue=&mono= — sirve el SVG ya personalizado.
export const iconsStaticRouter = Router();
iconsStaticRouter.get(
  '/:set/:file',
  asyncHandler(async (req, res) => {
    const { set, file } = req.params;
    if (!file.endsWith('.svg')) throw new HttpError(404, 'Ícono no encontrado');
    const name = file.slice(0, -4);
    const icon = byId.get(`${set}:${name}`);
    if (!icon) throw new HttpError(404, 'Ícono no encontrado');

    const filePath = path.join(ICONS_DIR, set, `${name}.svg`);
    if (!filePath.startsWith(ICONS_DIR)) throw new HttpError(404, 'Ícono no encontrado');

    const raw = fs.readFileSync(filePath, 'utf8');
    let svg = applyParams(raw, req.query);
    svg = applyColorEffects(svg, req.query);
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(svg);
  }),
);

export default iconsApiRouter;
