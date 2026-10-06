// Genera el paquete web del cuerpo humano a partir del código fuente de MPFB2
// (assets CC0). Uso:
//   node scripts/bake-avatar.mjs <ruta>/mpfb2/src/mpfb/data <salida>
// Salida: body.json con posiciones, triángulos, grupos de color y targets
// (morph targets dispersos) codificados en base64, cuantizados a Int16.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [dataDir, outDir] = process.argv.slice(2);
if (!dataDir || !outDir) {
  console.error('uso: node scripts/bake-avatar.mjs <mpfb data dir> <salida>');
  process.exit(1);
}
const TARGETS = path.join(dataDir, 'targets');

// ---------- malla base ----------
const objText = fs.readFileSync(path.join(dataDir, '3dobjs', 'base.obj'), 'utf8');
const pos = [];
const tris = [];
for (const line of objText.split('\n')) {
  if (line.startsWith('v ')) {
    const [, x, y, z] = line.trim().split(/\s+/);
    pos.push(Number(x), Number(y), Number(z));
  } else if (line.startsWith('f ')) {
    const ids = line.trim().split(/\s+/).slice(1).map((t) => Number(t.split('/')[0]) - 1);
    for (let i = 1; i < ids.length - 1; i++) tris.push(ids[0], ids[i], ids[i + 1]);
  }
}
const vertCount = pos.length / 3;

// ---------- grupos de color (piel, ojos, ropa, cabello) ----------
const groups = JSON.parse(fs.readFileSync(path.join(dataDir, 'mesh_metadata', 'basemesh_vertex_groups.json'), 'utf8'));
// 0 piel, 1 ojos, 2 mallas (leggings), 3 falda, 4 cabello, 5 otros (dientes, lengua, pestañas)
const GROUP_OF = { 'helper-l-eye': 1, 'helper-r-eye': 1, 'helper-tights': 2, 'helper-skirt': 3, 'helper-hair': 4 };
const vertGroup = new Uint8Array(vertCount); // 0 por defecto (piel)
for (const [name, ranges] of Object.entries(groups)) {
  const g = GROUP_OF[name] ?? (name.startsWith('helper-') && !name.includes('eye') ? 5 : null);
  if (g === null || g === undefined) continue;
  for (const [a, b] of ranges) for (let v = a; v <= b; v++) vertGroup[v] = g;
}

// ---------- targets ----------
function readTarget(relPath) {
  const buf = zlib.gunzipSync(fs.readFileSync(path.join(TARGETS, relPath)));
  const idx = [];
  const d = [];
  for (const line of buf.toString('utf8').split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p.length < 4) continue;
    idx.push(Number(p[0]));
    d.push(Number(p[1]), Number(p[2]), Number(p[3]));
  }
  return { idx, d };
}

function listDir(rel) {
  const dir = path.join(TARGETS, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.target.gz')).map((f) => path.join(rel, f));
}

const selected = []; // { name, group, rel }
// Macro: género × musculatura × peso (edad joven). Base = promedio.
for (const g of ['female', 'male']) for (const m of ['min', 'average', 'max']) for (const w of ['min', 'average', 'max']) {
  const rel = path.join('macrodetails', `universal-${g}-young-${m}muscle-${w}weight.target.gz`);
  if (fs.existsSync(path.join(TARGETS, rel))) selected.push({ name: `macro-${g}-${m}muscle-${w}weight`, group: 'macro', rel });
}
// Altura: min/max por género.
for (const g of ['female', 'male']) for (const h of ['min', 'max']) {
  const rel = path.join('macrodetails', 'height', `${g}-young-averagemuscle-averageweight-${h}height.target.gz`);
  if (fs.existsSync(path.join(TARGETS, rel))) selected.push({ name: `height-${g}-${h}`, group: 'height', rel });
}
// Rasgos faciales: pares -incr/-decr o -up/-down de estas familias.
const FACE_DIRS = ['nose', 'mouth', 'chin', 'cheek', 'ears', 'forehead', 'eyes', 'neck'];
for (const dir of FACE_DIRS) {
  for (const rel of listDir(dir)) {
    const base = path.basename(rel, '.target.gz');
    if (/^(l|r)-/.test(base) || /asym|jaw-[0-9]/.test(base)) continue; // solo simétricos
    selected.push({ name: base, group: 'face', rel });
  }
}
// Boca abierta (mandíbula) para hablar.
for (const cand of ['expression/units/neutral/mouth-open.target.gz', 'expression/units/african/mouth-open.target.gz']) {
  if (fs.existsSync(path.join(TARGETS, cand))) {
    selected.push({ name: 'mouth-open', group: 'mouth', rel: cand });
    break;
  }
}

const targets = [];
for (const t of selected) {
  const { idx, d } = readTarget(t.rel);
  let maxAbs = 0;
  for (const v of d) maxAbs = Math.max(maxAbs, Math.abs(v));
  if (maxAbs < 1e-6) continue; // target vacío
  const scale = maxAbs;
  const q = new Int16Array(d.length);
  for (let i = 0; i < d.length; i++) q[i] = Math.round((d[i] / scale) * 32767);
  targets.push({
    name: t.name,
    group: t.group,
    scale,
    indices: Buffer.from(new Uint32Array(idx).buffer).toString('base64'),
    deltas: Buffer.from(q.buffer).toString('base64'),
  });
}

const out = {
  vertCount,
  positions: Buffer.from(new Float32Array(pos).buffer).toString('base64'),
  indices: Buffer.from(new Uint32Array(tris).buffer).toString('base64'),
  groups: Buffer.from(vertGroup).toString('base64'),
  targets,
};
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'body.json');
fs.writeFileSync(file, JSON.stringify(out));
const kb = Math.round(fs.statSync(file).size / 1024);
console.log(`vértices=${vertCount} triángulos=${tris.length / 3} targets=${targets.length} tamaño=${kb} KB -> ${file}`);
console.log('targets:', targets.map((t) => `${t.group}:${t.name}`).join(', '));
