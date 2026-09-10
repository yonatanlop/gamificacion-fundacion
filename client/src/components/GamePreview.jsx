import { themeToStyle } from '../lib/theme.js';
import AnswerGrid from './AnswerGrid.jsx';

/** Vista previa estática de una pregunta con el tema aplicado. */
export default function GamePreview({ theme, question }) {
  const helper = themeToStyle(theme);
  const q = question || {
    text: '¿Cómo se ve tu juego?',
    image: '',
    options: [
      { id: 'a', text: 'Respuesta A' },
      { id: 'b', text: 'Respuesta B' },
      { id: 'c', text: 'Respuesta C' },
      { id: 'd', text: 'Respuesta D' },
    ],
  };

  return (
    <div className="game-theme overflow-hidden rounded-2xl" style={helper.style}>
      <div className="flex min-h-[420px] flex-col gap-5 p-6">
        {helper.theme.logo && (
          <img src={helper.theme.logo} alt="logo" className="mx-auto max-h-12 object-contain" />
        )}
        <h3
          className="text-center font-bold"
          style={{ fontSize: `calc(1.5rem * var(--heading-scale, 1))` }}
        >
          {q.text}
        </h3>
        {q.image && (
          <img src={q.image} alt="" className="mx-auto max-h-40 rounded-lg object-contain" />
        )}
        <AnswerGrid
          options={(q.options || []).slice(0, 6)}
          helper={helper}
          disabled
          layout={helper.theme.answerLayout}
        />
      </div>
    </div>
  );
}
