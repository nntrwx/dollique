// Draws a doll from its layers (images with transparent backgrounds stacked on top of each other).
// layers: [{ image_url, layer }], sorted or not. The size is set in CSS by the parent.
function DollFigure({ layers, label = 'Doll' }) {
  const sorted = [...layers].sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));

  return (
    <div className="doll" role="img" aria-label={label}>
      {sorted.map((part) => (
        <img
          key={part.image_url}
          className="doll__layer"
          src={part.image_url}
          alt=""
        />
      ))}
    </div>
  );
}

export default DollFigure;
