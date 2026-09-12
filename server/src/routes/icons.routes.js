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

// GET /api/icons/manifest — índice para el buscador del picker (público, sin datos sensibles).
export const iconsApiRouter = Router();
iconsApiRouter.get('/manifest', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(manifest);
});

// GET /icons/:set/:name.svg?color=&stroke=&size= — sirve el SVG ya personalizado.
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
    const svg = applyParams(raw, req.query);
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(svg);
  }),
);

export default iconsApiRouter;
