#!/usr/bin/env node
/**
 * Importa y normaliza los sets de íconos (Tabler + Lucide) desde node_modules
 * hacia server/assets/icons/, junto con un manifest.json para el buscador del
 * IconPicker. Se ejecuta UNA VEZ en desarrollo (no en el build de Docker); los
 * archivos generados se committean al repo.
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

function sanitizeSvg(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '') // comentarios (incl. licencia por-archivo)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '') // onload="", onclick"", etc.
    .replace(/\s(xlink:href|href)\s*=\s*"(https?:)?\/\/[^"]*"/gi, '')
    .trim();
}

function collectSet({ setName, srcDir, tagsMap, license, url }) {
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
  return { entries, license, url, count: entries.length };
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

const tabler = collectSet({
  setName: 'tabler',
  srcDir: path.resolve(__dirname, 'node_modules/@tabler/icons/icons/outline'),
  tagsMap: tablerTagsMap(),
  license: 'MIT',
  url: 'https://tabler.io/icons',
});

const lucide = collectSet({
  setName: 'lucide',
  srcDir: path.resolve(__dirname, 'node_modules/lucide-static/icons'),
  tagsMap: lucideTagsMap(),
  license: 'ISC',
  url: 'https://lucide.dev',
});

const manifest = {
  generatedAt: new Date().toISOString(),
  sources: [
    { set: 'tabler', label: 'Tabler Icons', license: tabler.license, url: tabler.url, count: tabler.count },
    { set: 'lucide', label: 'Lucide', license: lucide.license, url: lucide.url, count: lucide.count },
  ],
  icons: [...tabler.entries, ...lucide.entries],
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest));
console.log(`\nTotal: ${manifest.icons.length} íconos → ${OUT_DIR}`);
