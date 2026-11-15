import sheet from '../assets/images/crew/engineers_sheet.png';

/**
 * Crew working around the unlit rocket. Each sheet row is a different person.
 * leaves: the side they walk off to when the launch is called off. The one with `saysNo`
 * stays by the rocket and shakes "no" instead.
 */
const CREW = [
  { job: 'weld', left: '-4%', bottom: 'calc(-1px * var(--scale))', delay: '0s', leaves: 'left' },
  { job: 'hammer', left: '78%', bottom: 'calc(-1px * var(--scale))', delay: '0.2s', flip: true, leaves: 'right' },
  { job: 'walk', left: '18%', bottom: 'calc(-4px * var(--scale))', delay: '0.05s', patrol: true, leaves: 'left' },
  { job: 'check', left: '52%', bottom: 'calc(-4px * var(--scale))', delay: '0.35s', saysNo: true },
];

/** scrub: the launch was called off (no astronaut). Everyone walks away but one, who says "no". */
export function PadCrew({ scrub = false }) {
  return (
    <div className="crew" aria-hidden={!scrub}>
      {CREW.map((person) => {
        if (scrub && person.saysNo) {
          return (
            <span key={person.job} className="crew__mover" style={{ left: person.left, bottom: person.bottom }}>
              <span className="crew__bubble" role="status">No astronauts!</span>
              <span
                className={`engineer engineer--${person.job} is-saying-no`}
                style={{ backgroundImage: `url(${sheet})` }}
              />
            </span>
          );
        }
        if (scrub) {
          // Walking off, facing the way they go (the sprite faces right).
          return (
            <span
              key={person.job}
              className={`crew__mover is-leaving-${person.leaves}`}
              style={{ left: person.left, bottom: person.bottom, animationDelay: person.delay }}
            >
              <span
                className={person.leaves === 'left' ? 'engineer engineer--walk is-flip' : 'engineer engineer--walk'}
                style={{ backgroundImage: `url(${sheet})` }}
              />
            </span>
          );
        }
        return (
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
        );
      })}
    </div>
  );
}
