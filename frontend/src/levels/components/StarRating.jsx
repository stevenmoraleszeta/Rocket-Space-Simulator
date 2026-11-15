/** Row of 3 stars. `size` in design pixels (scaled with the window via rem). */
export function StarRating({ stars = 0, size = 22 }) {
  return (
    <span className="ms-stars" role="img" aria-label={`${stars} out of 3 stars`} style={{ fontSize: `${size / 16}rem` }}>
      {[1, 2, 3].map((s) => (
        <span key={s} className={stars >= s ? 'on' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  );
}
