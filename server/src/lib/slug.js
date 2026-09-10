export function slugify(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Devuelve un slug único, agregando -2, -3, ... si ya existe.
 * @param {string} base
 * @param {(slug: string) => Promise<boolean>} exists
 */
export async function uniqueSlug(base, exists) {
  const root = slugify(base) || 'quiz';
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}
