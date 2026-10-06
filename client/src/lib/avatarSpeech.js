// Reproduce el audio de una línea y, con los tiempos por carácter que devuelve ElevenLabs,
// escribe en `mouthRef.current` (0..1) cuánto debe estar abierta la boca. Simple y suficiente:
// abre en cada letra y cierra en espacios y puntuación.

export function speakLine({ url, alignment, mouthRef, onEnd }) {
  const audio = new Audio(url);
  const chars = alignment?.characters || [];
  const starts = alignment?.character_start_times_seconds || [];
  const ends = alignment?.character_end_times_seconds || [];
  let raf = 0;
  let value = 0;
  let stopped = false;

  function frame() {
    if (stopped) return;
    const t = audio.currentTime;
    let target = 0;
    for (let i = 0; i < starts.length; i++) {
      if (t >= starts[i] && t < (ends[i] ?? starts[i] + 0.1)) {
        target = /[\p{L}\p{N}]/u.test(chars[i] || '') ? 1 : 0;
        break;
      }
    }
    value += (target - value) * 0.5; // suaviza la apertura para que no parpadee
    if (mouthRef) mouthRef.current = value;
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    cancelAnimationFrame(raf);
    stopped = true;
    if (mouthRef) mouthRef.current = 0;
    onEnd?.();
  }

  audio.addEventListener('ended', finish);
  audio.addEventListener('error', finish);
  audio.play().then(() => {
    raf = requestAnimationFrame(frame);
  }).catch(finish);

  return {
    stop() {
      audio.pause();
      finish();
    },
  };
}
