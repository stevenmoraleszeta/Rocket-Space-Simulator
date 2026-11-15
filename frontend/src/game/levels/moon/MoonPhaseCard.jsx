/**
 * Corner card: the Moon when the ship arrives, from above (why it has phases) and from Earth.
 * The lit part comes from the real angle between the Moon and the Sun (moonTransfer.getMoonLook):
 * new Moon = dark, full Moon = all lit, waxing = lit on the right (seen from the north half of Earth).
 */
const R = 40

/** SVG path of the lit part of the disk, centered at 0,0. */
function litShape(look) {
  const { illumination, waxing } = look
  if (illumination < 0.005) return ''
  if (illumination > 0.995) return `M0 ${-R} A${R} ${R} 0 1 1 0 ${R} A${R} ${R} 0 1 1 0 ${-R} Z`
  // Terminator: an ellipse whose half-width shrinks to zero at the quarters.
  const rx = Math.abs(1 - 2 * illumination) * R
  const gibbous = illumination > 0.5
  const outerSweep = waxing ? 1 : 0
  const innerSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1)
  return `M0 ${-R} A${R} ${R} 0 0 ${outerSweep} 0 ${R} A${rx} ${R} 0 0 ${innerSweep} 0 ${-R} Z`
}

/** Small Moon disk with its lit part, for the day strip. */
export function MoonDisk({ look, className = 'moon-disk' }) {
  return (
    <svg viewBox={`${-R - 2} ${-R - 2} ${2 * R + 4} ${2 * R + 4}`} className={className} aria-hidden="true">
      <circle r={R} fill="#1a1d33" stroke="#3a4170" strokeWidth="3" />
      <path d={litShape(look)} fill="#ece8da" />
    </svg>
  )
}

/**
 * Seen from above the North Pole: sunlight comes from one side, Earth in the middle, the Moon on
 * its orbit. The Sun always lights the half of the Moon that faces it; from Earth we see part of
 * that lit half, and that part is the phase. Angles are "unwrapped" (they keep growing past 360°)
 * so the CSS transition always turns the short way when the day changes.
 */
function FromAbove({ moonTurnDeg, sunTurnDeg }) {
  return (
    <svg viewBox="-50 -50 100 100" className="moon-above" aria-hidden="true">
      <g className="moon-above__spin" style={{ transform: `rotate(${-sunTurnDeg}deg)` }}>
        <circle cx="56" cy="0" r="12" fill="#ffd23f" opacity="0.9" />
        {[-26, -9, 9, 26].map((y) => (
          <g key={y} className="moon-above__ray">
            <line x1="44" y1={y * 0.85} x2="20" y2={y * 0.85} stroke="#ffd23f" strokeWidth="1.6" strokeDasharray="3 3" />
            <path d={`M18 ${y * 0.85} l4 -2.5 v5 z`} fill="#ffd23f" />
          </g>
        ))}
      </g>
      <circle r="30" fill="none" stroke="rgba(160, 180, 230, 0.45)" strokeDasharray="2 3" />
      <circle r="7" fill="#2f7be0" />
      {/* Earth's night half: away from the Sun. */}
      <g className="moon-above__spin" style={{ transform: `rotate(${-sunTurnDeg}deg)` }}>
        <path d="M0 -7 A7 7 0 0 0 0 7 Z" fill="rgba(3, 6, 22, 0.75)" />
      </g>
      <g className="moon-above__spin" style={{ transform: `rotate(${-moonTurnDeg}deg)` }}>
        <line x1="8" y1="0" x2="23" y2="0" stroke="#ffffff" strokeWidth="1" strokeDasharray="1.5 2" opacity="0.7" />
        <circle cx="30" cy="0" r="6.5" fill="#1a1d33" stroke="#3a4170" strokeWidth="1" />
        {/* The lit half of the Moon always faces the Sun. */}
        <g className="moon-above__spin moon-above__lit" style={{ transform: `rotate(${moonTurnDeg - sunTurnDeg}deg)` }}>
          <path d="M30 -6.5 A6.5 6.5 0 0 1 30 6.5 Z" fill="#ece8da" />
        </g>
      </g>
    </svg>
  )
}

export function MoonPhaseCard({ look, dateLabel, title = 'Moon when you arrive', rating, moonTurnDeg = 0, sunTurnDeg = 0, place }) {
  const percent = Math.round(look.illumination * 100)
  return (
    <figure className="moon-phase-card" aria-label={`${title}: ${look.name}, ${percent}% lit, ${dateLabel}`}>
      <figcaption className="moon-phase-card__title">{title}</figcaption>
      <p className="moon-phase-card__date">{dateLabel}</p>
      <div className="moon-phase-card__pair">
        <div>
          <FromAbove moonTurnDeg={moonTurnDeg} sunTurnDeg={sunTurnDeg} />
          <small>From above</small>
        </div>
        <span className="moon-phase-card__arrow" aria-hidden="true">→</span>
        <div>
          <svg viewBox={`${-R - 6} ${-R - 6} ${2 * R + 12} ${2 * R + 12}`} className="moon-phase-card__disk" aria-hidden="true">
            <defs>
              <radialGradient id="moon-phase-lit" cx="40%" cy="38%" r="70%">
                <stop offset="0" stopColor="#f4f1e6" />
                <stop offset="1" stopColor="#b9b4a6" />
              </radialGradient>
            </defs>
            <circle r={R + 4} fill="rgba(255, 216, 74, 0.08)" />
            <circle r={R} fill="#1a1d33" stroke="#2c3157" strokeWidth="1.5" />
            <path d={litShape(look)} fill="url(#moon-phase-lit)" />
            {/* A few fixed craters so it reads as the Moon. */}
            <g fill="rgba(40, 40, 60, 0.18)">
              <circle cx="-12" cy="-14" r="6" />
              <circle cx="14" cy="6" r="8" />
              <circle cx="-6" cy="18" r="4" />
            </g>
          </svg>
          <small>From Earth</small>
        </div>
      </div>
      <p className="moon-phase-card__name">{look.symbol} {look.name}</p>
      <p className="moon-phase-card__lit">{percent}% of the side we see is lit</p>
      {rating && (
        <p className={`moon-phase-card__light is-${rating.tone}`}>
          <span aria-hidden="true">{'☀'.repeat(rating.level)}</span> {rating.label} for the cameras
        </p>
      )}
      {place && <p className="moon-phase-card__place">📍 {place}</p>}
    </figure>
  )
}
