// Draws a doll from its layers (images with transparent backgrounds stacked on top of each other).
// layers: [{ image_url, layer }], sorted or not. The size is set in CSS by the parent.
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
