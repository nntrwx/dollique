// Lace trims drawn as repeating SVG shapes. The shapes are built once, when the module loads.

function repeat(width, step, draw) {
  const items = [];
  for (let x = 0; x < width; x += step) items.push(draw(x));
  return items;
}

// Pink scalloped lace hanging under the black header, with ink holes.
const HEADER_LACE = repeat(2000, 26, (x) => (
  <g key={x}>
    <path d={`M${x} 5 a13 13 0 0 0 26 0Z`} fill="#ecc3cf" />
    <circle cx={x + 13} cy="10" r="3.2" fill="#211c1f" />
    <circle cx={x + 5} cy="7" r="1.2" fill="#211c1f" />
    <circle cx={x + 21} cy="7" r="1.2" fill="#211c1f" />
  </g>
));

export function HeaderLace() {
  return (
    <svg className="lace-h" viewBox="0 0 2000 22" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
      <rect width="2000" height="5" fill="#ecc3cf" />
      {HEADER_LACE}
    </svg>
  );
}

// Thin hand-drawn lace line between page sections.
const DIVIDER = repeat(1200, 30, (x) => (
  <g key={x}>
    <path d={`M${x} 4 q15 22 30 0`} />
    <circle cx={x + 15} cy="10" r="2.6" />
    <path d={`M${x + 6} 4 q9 9 18 0`} strokeWidth=".8" />
  </g>
));

export function LaceDivider() {
  return (
    <svg className="lace" viewBox="0 0 1200 26" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
      <g className="doodle" stroke="#c98a9c" strokeWidth="1.2">
        <path d="M0 3 C300 1 600 5 900 2 S1150 4 1200 3" />
        {DIVIDER}
      </g>
    </svg>
  );
}

// Tiny black lace under a category word on hover.
const RIBBON = repeat(600, 10, (x) => (
  <g key={x}>
    <path d={`M${x} 0 a5 5 0 0 0 10 0Z`} fill="#211c1f" />
    <circle cx={x + 5} cy="2.6" r="1.1" fill="#f4f1ec" />
  </g>
));

export function RibbonLace() {
  return (
    <svg className="lc" viewBox="0 0 600 9" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
      {RIBBON}
    </svg>
  );
}
