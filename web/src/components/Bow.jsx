// The ribbon bow from the admin panel logo.
function Bow({ className = 'bow' }) {
  return (
    <svg className={className} viewBox="0 0 44 26" aria-hidden="true">
      <path d="M22 11 C16 3 5 1 4 7 C3 13 14 14 22 11 Z" />
      <path d="M22 11 C28 3 39 1 40 7 C41 13 30 14 22 11 Z" />
      <path d="M20 12 L14 24 M24 12 L30 24" />
      <circle className="knot" cx="22" cy="11" r="2.8" />
    </svg>
  );
}

export default Bow;
