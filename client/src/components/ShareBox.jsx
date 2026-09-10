import { useState } from 'react';
import { Button } from './ui.jsx';
import QRCode from './QRCode.jsx';

/** Link público + botón copiar + QR desplegable. `path` ej: "/s/mi-slug" o "/play/mi-slug". */
export default function ShareBox({ path, label = 'Link para los participantes' }) {
  const url = `${window.location.origin}${path}`;
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-sm text-slate-700">{url}</code>
        <Button variant="secondary" onClick={copy}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </Button>
        <Button variant="ghost" onClick={() => setShowQR((v) => !v)}>
          {showQR ? 'Ocultar QR' : 'Ver QR'}
        </Button>
      </div>
      {showQR && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <QRCode value={url} size={260} />
          </div>
          <p className="text-xs text-slate-500">Proyecta este código para que lo escaneen con la cámara del celular.</p>
        </div>
      )}
    </div>
  );
}
