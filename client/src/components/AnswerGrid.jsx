import { Shape } from '../lib/shapes.jsx';

/**
 * Rejilla de respuestas tematizada, reutilizada en el juego y en la vista previa.
 * options: [{ id, text, image, color }]
 * Si la opción trae `color` propio, ese manda; si no, se usa la paleta del tema.
 */
export default function AnswerGrid({
  options,
  helper,
  selected = [],
  correctIds = null,
  disabled = false,
  layout = 'grid',
  onPick = () => {},
}) {
  return (
    <div
      className={
        layout === 'list'
          ? 'mx-auto flex w-full max-w-2xl flex-col gap-3'
          : 'mx-auto grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2'
      }
    >
      {options.map((opt, i) => {
        const isSelected = selected.includes(opt.id);
        const isCorrect = correctIds?.includes(opt.id);
        const showState = correctIds != null;
        let ring = '';
        if (showState && isCorrect) ring = 'ring-4 ring-white';
        else if (showState && isSelected && !isCorrect) ring = 'opacity-50 grayscale';
        else if (!showState && isSelected) ring = 'ring-4 ring-white';

        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(opt.id)}
            style={{ backgroundColor: opt.color || helper.optionColor(i) }}
            className={`flex min-h-[64px] items-center gap-3 rounded-xl px-4 py-3 text-left text-lg font-bold text-white shadow-lg transition ${ring} ${
              disabled ? 'cursor-default' : 'hover:brightness-110'
            }`}
          >
            <span className="shrink-0 text-white/90">
              <Shape name={helper.optionShape(i)} className="h-6 w-6" />
            </span>
            {opt.image && (
              <img src={opt.image} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
            )}
            <span className="min-w-0 break-words">{opt.text || `Opción ${i + 1}`}</span>
            {showState && isCorrect && <span className="ml-auto text-2xl">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
