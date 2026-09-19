/** Detecta si el navegador puede renderizar gráficos WebGL (necesario para la escena 3D de Globos). */
export function isWebglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}
