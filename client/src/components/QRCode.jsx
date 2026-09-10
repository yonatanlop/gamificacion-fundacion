import { useEffect, useState } from 'react';
import QR from 'qrcode';

/** Muestra un código QR para `value` como imagen. */
export default function QRCode({ value, size = 220, className = '' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QR.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(''));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) return <div style={{ width: size, height: size }} className={`bg-slate-100 ${className}`} />;
  return <img src={src} alt="Código QR" width={size} height={size} className={className} />;
}
