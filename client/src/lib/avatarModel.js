// Modelo humano paramétrico (MakeHuman / MPFB2, CC0). El paquete body.json lo genera
// scripts/bake-avatar.mjs. Aquí se decodifica una sola vez y se calculan las posiciones
// de la malla según los sliders, sumando targets dispersos ponderados.

const PAIR_SUFFIXES = [
  ['incr', 'decr'],
  ['up', 'down'],
  ['compress', 'uncompress'],
  ['concave', 'convex'],
];

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let loading = null;
/** Carga y decodifica el paquete una sola vez (en memoria). */
export function loadBodyModel() {
  if (!loading) {
    loading = fetch('/avatar/body.json')
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el modelo humano');
        return r.json();
      })
      .then(decodeBody);
  }
  return loading;
}

function decodeBody(raw) {
  const positions = new Float32Array(b64ToBytes(raw.positions).buffer.slice(0));
  const indices = new Uint32Array(b64ToBytes(raw.indices).buffer.slice(0));
  const groups = b64ToBytes(raw.groups);
  const targets = raw.targets.map((t) => ({
    name: t.name,
    group: t.group,
    scale: t.scale,
    idx: new Uint32Array(b64ToBytes(t.indices).buffer.slice(0)),
    q: new Int16Array(b64ToBytes(t.deltas).buffer.slice(0)),
  }));
  const byName = new Map(targets.map((t) => [t.name, t]));
  return { vertCount: raw.vertCount, base: positions, indices, groups, targets, byName, catalog: buildCatalog(targets) };
}

/** Sliders de rasgos: cada par de targets (p. ej. nose-point-up / nose-point-down) es un slider -1..1. */
function buildCatalog(targets) {
  const face = targets.filter((t) => t.group === 'face').map((t) => t.name);
  const seen = new Set();
  const pairs = [];
  for (const name of face) {
    if (seen.has(name)) continue;
    let matched = null;
    for (const [pos, neg] of PAIR_SUFFIXES) {
      if (name.endsWith(`-${pos}`)) {
        const other = name.slice(0, -pos.length) + neg;
        if (face.includes(other)) matched = { key: name.slice(0, -pos.length - 1), pos: name, neg: other };
      } else if (name.endsWith(`-${neg}`)) {
        const other = name.slice(0, -neg.length) + pos;
        if (face.includes(other)) matched = { key: name.slice(0, -neg.length - 1), pos: other, neg: name };
      }
      if (matched) break;
    }
    if (matched) {
      seen.add(matched.pos);
      seen.add(matched.neg);
      pairs.push(matched);
    }
  }
  return pairs.map((p) => ({ ...p, label: labelFor(p.key) }));
}

const PART_LABELS = {
  nose: 'Nariz',
  mouth: 'Boca y labios',
  chin: 'Mentón',
  cheek: 'Pómulos',
  ears: 'Orejas',
  forehead: 'Frente',
  eyes: 'Ojos',
  neck: 'Cuello',
};

function labelFor(key) {
  const [part, ...rest] = key.split('-');
  const base = PART_LABELS[part] || part;
  return rest.length ? `${base} · ${rest.join(' ')}` : base;
}

/** Pesos macro (género, musculatura, peso) según la interpolación multilineal de MakeHuman. */
function triWeights(v) {
  // 0 = min, 0.5 = average, 1 = max
  if (v <= 0.5) return { min: 1 - 2 * v, average: 2 * v, max: 0 };
  return { min: 0, average: 2 - 2 * v, max: 2 * v - 1 };
}

/**
 * Calcula las posiciones de la malla para los valores dados.
 * params: { gender 0..1 (0 mujer, 1 hombre), muscle 0..1, weight 0..1, height -1..1,
 *           faces: { [pairKey]: -1..1 }, mouthOpen 0..1 }
 */
export function computePositions(model, params) {
  const out = new Float32Array(model.base);
  const g = clamp01(params.gender ?? 0.5);
  const wF = 1 - g;
  const wM = g;
  const mus = triWeights(clamp01(params.muscle ?? 0.5));
  const wgt = triWeights(clamp01(params.weight ?? 0.5));
  const apply = (name, w) => {
    const t = model.byName.get(name);
    if (!t || Math.abs(w) < 1e-4) return;
    const k = w * t.scale / 32767;
    for (let i = 0; i < t.idx.length; i++) {
      const v = t.idx[i] * 3;
      out[v] += k * t.q[i * 3];
      out[v + 1] += k * t.q[i * 3 + 1];
      out[v + 2] += k * t.q[i * 3 + 2];
    }
  };

  for (const gender of ['female', 'male']) {
    const gw = gender === 'female' ? wF : wM;
    for (const m of ['min', 'average', 'max']) {
      for (const w of ['min', 'average', 'max']) {
        apply(`macro-${gender}-${m}muscle-${w}weight`, gw * mus[m] * wgt[w]);
      }
    }
  }

  const h = clamp(params.height ?? 0, -1, 1);
  for (const gender of ['female', 'male']) {
    const gw = gender === 'female' ? wF : wM;
    apply(`height-${gender}-max`, gw * Math.max(0, h));
    apply(`height-${gender}-min`, gw * Math.max(0, -h));
  }

  for (const pair of model.catalog) {
    const v = clamp(params.faces?.[pair.key] ?? 0, -1, 1);
    if (v > 0) apply(pair.pos, v);
    else if (v < 0) apply(pair.neg, -v);
  }

  if (params.mouthOpen) apply('mouth-open', clamp01(params.mouthOpen));
  return out;
}

export function clamp01(x) {
  return clamp(x, 0, 1);
}
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : 0));
}
