import sheet from '../assets/images/crew/engineers_sheet.png';

/** Crew working around the unlit rocket during preparation. */
const CREW = [
  { job: 'weld', left: '-4%', bottom: 'calc(-1px * var(--scale))', delay: '0s' },
  { job: 'hammer', left: '78%', bottom: 'calc(-1px * var(--scale))', delay: '0.2s', flip: true },
  { job: 'walk', left: '18%', bottom: 'calc(-4px * var(--scale))', delay: '0.05s', patrol: true },
  { job: 'check', left: '52%', bottom: 'calc(-4px * var(--scale))', delay: '0.35s' },
];

export function PadCrew() {
  return (
    <div className="crew" aria-hidden="true">
      {CREW.map((person) => (
        <span
          key={person.job}
          className={person.patrol ? 'crew__mover is-patrol' : 'crew__mover'}
          style={{ left: person.left, bottom: person.bottom }}
        >
          <span
            className={person.flip ? `engineer engineer--${person.job} is-flip` : `engineer engineer--${person.job}`}
            style={{ backgroundImage: `url(${sheet})`, animationDelay: person.delay }}
          />
        </span>
      ))}
    </div>
  );
}
