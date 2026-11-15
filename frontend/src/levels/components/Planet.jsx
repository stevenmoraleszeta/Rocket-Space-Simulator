/**
 * Planet drawing. Uses the sprite from assets/sprites.js when there is one,
 * otherwise falls back to the built-in SVG drawing.
 */
import { SPRITES } from '../assets/sprites.js';

export function Planet({ planet, size = 120, locked = false }) {
  // `size` is in design pixels; rem makes it follow the window scale (see lib/uiScale.js).
  const box = { width: `${size / 16}rem`, height: `${size / 16}rem` };
  const sprite = SPRITES.planets[planet];
  const cls = `ms-planet ${locked ? 'is-locked' : ''} ${sprite?.pixelArt ? 'is-pixel' : ''}`;

  if (sprite?.src) {
    const frames = Math.max(1, sprite.frames || 1);
    if (frames === 1) {
      return <img className={cls} src={sprite.src} style={box} alt="" draggable="false" />;
    }
    // Horizontal sprite sheet: step through the frames with a CSS animation
    return (
      <div
        className={`${cls} ms-sprite`}
        aria-hidden="true"
        style={{
          ...box,
          backgroundImage: `url(${sprite.src})`,
          backgroundSize: `${frames * 100}% 100%`,
          animationDuration: `${frames / (sprite.fps || 8)}s`,
          animationTimingFunction: `steps(${frames - 1}, jump-none)`,
        }}
      />
    );
  }

  return <PlanetSVG planet={planet} box={box} className={cls} />;
}

/** Built-in drawings, used until the sprites arrive. */
function PlanetSVG({ planet, box, className }) {
  const art = {
    earth: (
      <>
        <circle cx="50" cy="50" r="44" fill="#2f7be0" />
        <path d="M22 38c8-10 22-12 26-4s-6 10-2 18-10 12-18 6-12-12-6-20z" fill="#3ddc97" />
        <path d="M60 22c10 0 20 8 22 18-6 2-10-4-16-2s-10-2-10-8 0-8 4-8z" fill="#3ddc97" />
        <path d="M58 64c8-4 18 0 18 6s-10 12-16 10-8-12-2-16z" fill="#3ddc97" />
        <path d="M14 46c10-4 20 2 34 0s24-8 38-2" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".55" />
      </>
    ),
    moon: (
      <>
        <circle cx="50" cy="50" r="44" fill="#c9cdd6" />
        <circle cx="34" cy="36" r="10" fill="#a9aebb" />
        <circle cx="62" cy="58" r="13" fill="#a9aebb" />
        <circle cx="66" cy="28" r="6" fill="#a9aebb" />
        <circle cx="32" cy="68" r="7" fill="#a9aebb" />
      </>
    ),
    mars: (
      <>
        <circle cx="50" cy="50" r="44" fill="#e0643a" />
        <path d="M14 40c14 4 26-4 40 0s22 6 32 2" stroke="#b8441f" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M18 64c12-2 22 4 34 2s20-6 30-2" stroke="#b8441f" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="66" cy="30" r="6" fill="#f08a62" />
        <ellipse cx="50" cy="10" rx="14" ry="4" fill="#fff" opacity=".8" />
      </>
    ),
  }[planet];

  return (
    <svg className={className} viewBox="0 0 100 100" style={box} aria-hidden="true">
      <defs>
        <radialGradient id={`ms-shade-${planet}`} cx="35%" cy="30%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity=".35" />
        </radialGradient>
      </defs>
      {art}
      <circle cx="50" cy="50" r="44" fill={`url(#ms-shade-${planet})`} />
    </svg>
  );
}
