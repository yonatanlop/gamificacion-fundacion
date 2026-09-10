const paths = {
  triangle: 'M12 3 L22 20 L2 20 Z',
  diamond: 'M12 2 L22 12 L12 22 L2 12 Z',
  circle: null,
  square: 'M4 4 H20 V20 H4 Z',
};

export function Shape({ name = 'square', className = 'w-6 h-6' }) {
  if (name === 'circle') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={paths[name] || paths.square} fill="currentColor" />
    </svg>
  );
}
