import { Button, Textarea } from './ui.jsx';

/**
 * Lista editable de mensajes narrativos que aparecen entre preguntas
 * (`{ beforeIndex, text }`, 0-basado). Usado por el tipo "Tuberías".
 */
export default function StoryBeatsField({ value, onChange, questionCount }) {
  const beats = value || [];

  function update(i, patch) {
    onChange(beats.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function remove(i) {
    onChange(beats.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...beats, { beforeIndex: 0, text: '' }]);
  }

  return (
    <div className="space-y-3">
      {beats.map((b, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Antes de la pregunta #</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, questionCount)}
              value={b.beforeIndex + 1}
              onChange={(e) => update(i, { beforeIndex: Math.max(0, Number(e.target.value) - 1) })}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <Button variant="ghost" className="ml-auto" onClick={() => remove(i)}>
              ✕
            </Button>
          </div>
          <Textarea
            rows={2}
            placeholder="Mensaje que verá el jugador antes de esa pregunta"
            value={b.text}
            onChange={(e) => update(i, { text: e.target.value })}
          />
        </div>
      ))}
      <Button variant="ghost" onClick={add}>
        + Agregar mensaje
      </Button>
    </div>
  );
}
