// Hand-drawn bits: shapes get a slight wobble from the SVG filters in Layout.

// A loose pink circle around a word (selected category, active tab).
export function DoodleCircle({ className = 'circ' }) {
  return (
    <svg className={className} viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
      <path className="doodle" d="M30 10 C80 -2 172 4 192 24 C206 46 140 60 80 57 C22 54 -4 40 10 24 C20 12 50 6 76 6" stroke="#c98a9c" strokeWidth="2" />
    </svg>
  );
}

// Underline with a little star at the end (active feed tab).
export function DoodleUnderline() {
  return (
    <svg className="underline" viewBox="0 0 120 50" preserveAspectRatio="none" aria-hidden="true">
      <path className="doodle" d="M6 44 C40 47 90 46 116 42" stroke="#c98a9c" strokeWidth="2.2" />
      <path className="doodle" d="M116 2 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" stroke="#c98a9c" strokeWidth="1.4" />
    </svg>
  );
}

// Four-point star path, used for sparkles.
export function starPath(x, y, r) {
  const k = r * 0.18;
  return `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`;
}

export function Sparkle({ className = 'sparkle', size = 40 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path className="doodle" d={starPath(20, 20, 14)} stroke="#211c1f" strokeWidth="1.5" fill="#ecc3cf" />
    </svg>
  );
}

// Wobbly double line under the "Top dolls" shelf.
export function ShelfLine() {
  return (
    <svg className="shelf-line" viewBox="0 0 260 14" preserveAspectRatio="none" aria-hidden="true">
      <path className="doodle" d="M2 6 C60 3 120 8 180 5 S240 6 258 5" stroke="#211c1f" strokeWidth="2" />
      <path className="doodle" d="M8 10 C70 12 160 9 252 11" stroke="#c98a9c" strokeWidth="1.2" />
    </svg>
  );
}
