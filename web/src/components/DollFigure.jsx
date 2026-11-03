// doll = image layers stacked on top of each other
function DollFigure({ layers, label = 'Doll', className = '' }) {
  const sorted = [...layers].sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));

  return (
    <span className={`doll${className ? ` ${className}` : ''}`} role="img" aria-label={label}>
      {sorted.map((part) => (
        <img
          key={part.image_url}
          className={part.highlight ? 'hl' : undefined}
          src={part.image_url}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
    </span>
  );
}

export default DollFigure;
