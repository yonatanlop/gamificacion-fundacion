import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { Button, Card, Input, Textarea, Spinner } from '../../components/ui.jsx';
import { loadBodyModel } from '../../lib/avatarModel.js';
import { speakLine } from '../../lib/avatarSpeech.js';
import { isWebglAvailable } from '../../lib/webgl.js';

const AvatarScene3D = lazy(() => import('../../components/avatar3d/AvatarScene3D.jsx'));

const DEFAULT_CONFIG = {
  params: { gender: 0, muscle: 0.5, weight: 0.5, height: 0, faces: {} },
  look: {
    skin: '#e0b08a',
    eyes: '#4b3621',
    hair: '#2b1d14',
    pants: '#1e3a8a',
    skirt: '#7c2d12',
    skirtOn: false,
    background: '#dbeafe',
  },
};

function withDefaults(config) {
  const c = config || {};
  return {
    params: { ...DEFAULT_CONFIG.params, ...(c.params || {}), faces: { ...(c.params?.faces || {}) } },
    look: { ...DEFAULT_CONFIG.look, ...(c.look || {}) },
  };
}

function Slider({ label, value, min, max, step = 0.01, onChange, format }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm text-slate-700">
        <span>{label}</span>
        <span className="tabular-nums text-slate-500">{format ? format(value) : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </label>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 text-sm text-slate-700">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-14 cursor-pointer rounded border border-slate-300"
      />
    </label>
  );
}

export default function AvatarEditorPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const webglOk = useMemo(() => isWebglAvailable(), []);

  const avatarQ = useQuery({ queryKey: ['avatar', id], queryFn: () => api.authGet(`/avatars/${id}`) });
  const voicesQ = useQuery({ queryKey: ['avatar-voices'], queryFn: () => api.authGet('/avatars/voices'), retry: false });
  const modelQ = useQuery({ queryKey: ['avatar-model'], queryFn: loadBodyModel, staleTime: Infinity });

  const [name, setName] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [script, setScript] = useState([]);
  const [voiceId, setVoiceId] = useState('');
  const [status, setStatus] = useState('');
  const [speaking, setSpeaking] = useState(null); // índice de la línea que habla
  const mouthRef = useRef(0);
  const playerRef = useRef(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const a = avatarQ.data?.avatar;
    if (!a) return;
    setName(a.name);
    setConfig(withDefaults(a.config));
    setScript(Array.isArray(a.script) ? a.script : []);
    setVoiceId(a.voiceId || '');
    setDirty(false);
  }, [avatarQ.data]);

  const save = useMutation({
    mutationFn: (body) => api.authPatch(`/avatars/${id}`, body),
    onSuccess: () => {
      setDirty(false);
      setStatus('Guardado');
      qc.invalidateQueries({ queryKey: ['avatar', id] });
    },
    onError: (e) => setStatus(e.message),
  });

  function edit(fn) {
    setConfig((c) => fn(structuredClone(c)));
    setDirty(true);
  }
  const setParam = (key, v) => edit((c) => ({ ...c, params: { ...c.params, [key]: v } }));
  const setFace = (key, v) => edit((c) => ({ ...c, params: { ...c.params, faces: { ...c.params.faces, [key]: v } } }));
  const setLook = (key, v) => edit((c) => ({ ...c, look: { ...c.look, [key]: v } }));

  // Parámetros que consume la escena (el look lo usa aparte).
  const sceneParams = config.params;
  const sceneLook = config.look;

  const catalog = modelQ.data?.catalog || [];
  const faceGroups = useMemo(() => {
    const g = new Map();
    for (const p of catalog) {
      const part = p.key.split('-')[0];
      if (!g.has(part)) g.set(part, []);
      g.get(part).push(p);
    }
    return [...g.entries()];
  }, [catalog]);

  function startSpeak(index) {
    stopSpeak();
    const line = script[index];
    if (!line?.trim()) return;
    if (!voiceId) return setStatus('Elige una voz primero');
    setSpeaking(index);
    setStatus('Generando voz…');
    api
      .authPost('/avatars/speak', { text: line, voiceId })
      .then((r) => {
        setStatus(r.cached ? 'Voz desde caché (no gasta cuota)' : 'Voz generada');
        playerRef.current = speakLine({
          url: r.url,
          alignment: r.alignment,
          mouthRef,
          onEnd: () => setSpeaking(null),
        });
      })
      .catch((e) => {
        setSpeaking(null);
        setStatus(e.message);
      });
  }
  function stopSpeak() {
    playerRef.current?.stop();
    playerRef.current = null;
    mouthRef.current = 0;
    setSpeaking(null);
  }

  if (avatarQ.isLoading || modelQ.isLoading) return <Spinner label="Cargando avatar…" />;
  if (avatarQ.isError) return <p className="text-red-600">{avatarQ.error.message}</p>;
  if (modelQ.isError) return <p className="text-red-600">{modelQ.error.message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/avatares" className="text-sm text-slate-500 hover:text-indigo-700">
          ← Avatares
        </Link>
        <h1 className="font-display text-xl font-bold">{name || 'Avatar'}</h1>
        <div className="ml-auto flex items-center gap-2">
          {status && <span className="text-sm text-slate-500">{status}</span>}
          <Button
            onClick={() => save.mutate({ name, config, script, voiceId: voiceId || '' })}
            disabled={!dirty || save.isPending}
          >
            {save.isPending ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <Card>
            <Input label="Nombre" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
          </Card>

          <Card className="space-y-3">
            <p className="font-semibold">Cuerpo</p>
            <Slider label="Género (mujer ↔ hombre)" value={sceneParams.gender} min={0} max={1} onChange={(v) => setParam('gender', v)} format={(v) => (v < 0.5 ? 'Mujer' : 'Hombre')} />
            <Slider label="Musculatura" value={sceneParams.muscle} min={0} max={1} onChange={(v) => setParam('muscle', v)} />
            <Slider label="Peso" value={sceneParams.weight} min={0} max={1} onChange={(v) => setParam('weight', v)} />
            <Slider label="Altura" value={sceneParams.height} min={-1} max={1} onChange={(v) => setParam('height', v)} format={(v) => (v === 0 ? 'Normal' : v > 0 ? `+${Math.round(v * 100)}%` : `${Math.round(v * 100)}%`)} />
          </Card>

          <Card className="space-y-3">
            <p className="font-semibold">Rasgos del rostro</p>
            {faceGroups.map(([part, items]) => (
              <details key={part} className="rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer font-medium text-slate-800">{items[0].label.split(' · ')[0]}</summary>
                <div className="mt-3 space-y-3">
                  {items.map((p) => (
                    <Slider
                      key={p.key}
                      label={p.label.includes(' · ') ? p.label.split(' · ').slice(1).join(' · ') : p.label}
                      value={sceneParams.faces[p.key] ?? 0}
                      min={-1}
                      max={1}
                      onChange={(v) => setFace(p.key, v)}
                    />
                  ))}
                </div>
              </details>
            ))}
          </Card>

          <Card className="space-y-2">
            <p className="font-semibold">Color, ropa y fondo</p>
            <ColorRow label="Color de piel" value={sceneLook.skin} onChange={(v) => setLook('skin', v)} />
            <ColorRow label="Color de ojos" value={sceneLook.eyes} onChange={(v) => setLook('eyes', v)} />
            <ColorRow label="Color de cabello" value={sceneLook.hair} onChange={(v) => setLook('hair', v)} />
            <ColorRow label="Color del pantalón / mallas" value={sceneLook.pants} onChange={(v) => setLook('pants', v)} />
            <label className="flex items-center justify-between py-1 text-sm text-slate-700">
              <span>Falda</span>
              <input type="checkbox" checked={sceneLook.skirtOn} onChange={(e) => setLook('skirtOn', e.target.checked)} />
            </label>
            {sceneLook.skirtOn && <ColorRow label="Color de la falda" value={sceneLook.skirt} onChange={(v) => setLook('skirt', v)} />}
            <ColorRow label="Color de fondo" value={sceneLook.background} onChange={(v) => setLook('background', v)} />
          </Card>

          <Card className="space-y-3">
            <p className="font-semibold">Voz y guion</p>
            {voicesQ.isError ? (
              <p className="text-sm text-amber-700">{voicesQ.error.message}</p>
            ) : (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Voz</span>
                <select
                  value={voiceId}
                  onChange={(e) => { setVoiceId(e.target.value); setDirty(true); }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— Elegir voz —</option>
                  {(voicesQ.data?.voices || []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name.split(' - ')[0]} ({v.gender || '—'}, {v.accent || v.language || '—'})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {script.map((line, i) => (
              <div key={i} className="flex gap-2">
                <Textarea
                  rows={2}
                  value={line}
                  onChange={(e) => {
                    const next = [...script];
                    next[i] = e.target.value;
                    setScript(next);
                    setDirty(true);
                  }}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1">
                  {speaking === i ? (
                    <Button variant="secondary" onClick={stopSpeak}>■ Parar</Button>
                  ) : (
                    <Button onClick={() => startSpeak(i)} disabled={!line.trim()}>▶ Hablar</Button>
                  )}
                  <Button variant="ghost" onClick={() => { setScript(script.filter((_, j) => j !== i)); setDirty(true); }}>✕</Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setScript([...script, '']); setDirty(true); }}>+ Línea</Button>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="relative h-[560px] w-full overflow-hidden rounded-2xl shadow-lg">
            {webglOk ? (
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500">Cargando escena…</div>}>
                <div className="absolute inset-0">
                  <AvatarScene3D model={modelQ.data} params={sceneParams} look={sceneLook} mouthRef={mouthRef} />
                </div>
              </Suspense>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center text-slate-600">
                Tu navegador no soporta gráficos 3D.
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">Vista previa en vivo</p>
        </div>
      </div>
    </div>
  );
}
