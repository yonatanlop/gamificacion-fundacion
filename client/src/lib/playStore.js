const key = (slug) => `gf_play_${slug}`;

export function saveGame(slug, data) {
  try {
    sessionStorage.setItem(key(slug), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadGame(slug) {
  try {
    const raw = sessionStorage.getItem(key(slug));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearGame(slug) {
  try {
    sessionStorage.removeItem(key(slug));
  } catch {
    /* ignore */
  }
}
