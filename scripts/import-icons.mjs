#!/usr/bin/env node
/**
 * Importa y normaliza los sets de íconos (Tabler, Lucide, Fluent Emoji Flat,
 * Noto) desde node_modules hacia server/assets/icons/, junto con un
 * manifest.json para el buscador del IconPicker. Se ejecuta UNA VEZ en
 * desarrollo (no en el build de Docker); los archivos generados se committean
 * al repo.
 *
 * Uso:
 *   cd scripts && npm install && node import-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../server/assets/icons');
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKIN_TONE_RE = /-skin-tone|-tone\d/; // variantes de tono de piel: se omiten (ruido y duplican el concepto base)

function sanitizeSvg(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '') // comentarios (incl. licencia por-archivo)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '') // onload="", onclick"", etc.
    .replace(/\s(xlink:href|href)\s*=\s*"(https?:)?\/\/[^"]*"/gi, '')
    .trim();
}

/** Sets con archivos SVG sueltos (Tabler, Lucide): un ícono de un solo color, editable con currentColor. */
function collectFileSet({ setName, srcDir, tagsMap, license, url }) {
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.svg'));
  const destDir = path.join(OUT_DIR, setName);
  fs.mkdirSync(destDir, { recursive: true });

  const entries = [];
  let skipped = 0;
  for (const file of files) {
    const name = file.replace(/\.svg$/, '');
    if (!NAME_RE.test(name)) {
      skipped += 1;
      continue;
    }
    const raw = fs.readFileSync(path.join(srcDir, file), 'utf8');
    if (!raw.includes('viewBox')) {
      skipped += 1;
      continue;
    }
    fs.writeFileSync(path.join(destDir, `${name}.svg`), sanitizeSvg(raw));
    const tags = tagsMap(name) || [];
    entries.push({ id: `${setName}:${name}`, set: setName, name, tags });
  }
  console.log(`[${setName}] ${entries.length} íconos importados, ${skipped} omitidos`);
  return { entries, license, url, count: entries.length, recolorable: true };
}

/**
 * Sets en formato Iconify JSON (Fluent Emoji Flat, Noto): emoji a todo color,
 * con varios tonos fijos por ícono — NO se pueden recolorear con un control
 * único (recolorable:false). Se arma el SVG completo a partir de icons.json
 * (`body` + viewBox) y se usan las categorías de metadata.json como etiqueta.
 */
function collectIconifySet({ setName, pkgDir, license, url }) {
  const icons = JSON.parse(fs.readFileSync(path.join(pkgDir, 'icons.json'), 'utf8'));
  const metaPath = path.join(pkgDir, 'metadata.json');
  const categoryByName = new Map();
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    for (const [category, names] of Object.entries(meta.categories || {})) {
      for (const n of names) categoryByName.set(n, category.toLowerCase());
    }
  }

  const destDir = path.join(OUT_DIR, setName);
  fs.mkdirSync(destDir, { recursive: true });

  const entries = [];
  let skipped = 0;
  for (const [name, def] of Object.entries(icons.icons)) {
    if (!NAME_RE.test(name) || SKIN_TONE_RE.test(name)) {
      skipped += 1;
      continue;
    }
    const w = def.width || icons.width || 24;
    const h = def.height || icons.height || 24;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${def.body}</svg>`;
    fs.writeFileSync(path.join(destDir, `${name}.svg`), sanitizeSvg(svg));

    const category = categoryByName.get(name);
    const words = name.split('-');
    const tags = [...new Set([category, ...words].filter(Boolean))];
    entries.push({ id: `${setName}:${name}`, set: setName, name, tags });
  }
  console.log(`[${setName}] ${entries.length} íconos importados, ${skipped} omitidos (incl. tonos de piel)`);
  return { entries, license, url, count: entries.length, recolorable: false };
}

function tablerTagsMap() {
  const metaPath = path.resolve(__dirname, 'node_modules/@tabler/icons/icons.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  return (name) => {
    const m = meta[name];
    if (!m) return [];
    return [...new Set([m.category, ...(m.tags || [])])]
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());
  };
}

function lucideTagsMap() {
  const tagsPath = path.resolve(__dirname, 'node_modules/lucide-static/tags.json');
  const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
  return (name) => (tags[name] || []).map((t) => t.toLowerCase());
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const tabler = collectFileSet({
  setName: 'tabler',
  srcDir: path.resolve(__dirname, 'node_modules/@tabler/icons/icons/outline'),
  tagsMap: tablerTagsMap(),
  license: 'MIT',
  url: 'https://tabler.io/icons',
});

const lucide = collectFileSet({
  setName: 'lucide',
  srcDir: path.resolve(__dirname, 'node_modules/lucide-static/icons'),
  tagsMap: lucideTagsMap(),
  license: 'ISC',
  url: 'https://lucide.dev',
});

const fluent = collectIconifySet({
  setName: 'fluent-emoji',
  pkgDir: path.resolve(__dirname, 'node_modules/@iconify-json/fluent-emoji-flat'),
  license: 'MIT',
  url: 'https://github.com/microsoft/fluentui-emoji',
});

const noto = collectIconifySet({
  setName: 'noto',
  pkgDir: path.resolve(__dirname, 'node_modules/@iconify-json/noto'),
  license: 'Apache-2.0',
  url: 'https://github.com/googlefonts/noto-emoji',
});

const sets = [
  { key: 'tabler', label: 'Tabler Icons', data: tabler },
  { key: 'lucide', label: 'Lucide', data: lucide },
  { key: 'fluent-emoji', label: 'Fluent Emoji', data: fluent },
  { key: 'noto', label: 'Noto Emoji', data: noto },
];

const manifest = {
  generatedAt: new Date().toISOString(),
  sources: sets.map(({ key, label, data }) => ({
    set: key,
    label,
    license: data.license,
    url: data.url,
    count: data.count,
    recolorable: data.recolorable,
  })),
  icons: sets.flatMap(({ data }) => data.entries),
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest));
console.log(`\nTotal: ${manifest.icons.length} íconos → ${OUT_DIR}`);
