import { PARTS, ROCKET, partCount } from './parts.js';

function sheetStyle(part, lit) {
  const x = lit || part.offX == null ? part.frameX : part.offX;
  const y = lit || part.offY == null ? part.frameY : part.offY;
  return {
    backgroundImage: `url(${part.sheet})`,
    backgroundPosition: `${-x}px ${-y}px`,
    backgroundSize: `${part.sheetWidth}px ${part.sheetHeight}px`,
  };
}

/** Pixel rocket with the parts the player chose stacked on the same sprite cell. */
export function Rocket({ equipped, flying = false, open = false }) {
  const classes = ['rocket'];
  if (flying) classes.push('is-flying');
  if (open) classes.push('rocket--open');

  const interior = PARTS.filter((part) => part.inside && partCount(equipped, part.id) > 0);

  return (
    <div className={classes.join(' ')}>
      {open && (
        <div className="rocket__cabin">
          {interior.map((part) => {
            const count = partCount(equipped, part.id);
            return (
              <span key={part.id} className="rocket__cargo-slot">
                <img className="rocket__cargo" src={part.src} alt="" />
                {count > 1 && <span className="rocket__qty">{count}</span>}
              </span>
            );
          })}
        </div>
      )}
      <span
        className={open ? 'rocket__layer rocket__hull' : 'rocket__layer'}
        style={{
          backgroundImage: `url(${flying ? ROCKET.src : ROCKET.off})`,
          backgroundSize: `${ROCKET.frame}px ${ROCKET.frame}px`,
        }}
      />
      {PARTS.filter((part) => part.sheet && partCount(equipped, part.id) > 0).map((part) => (
        <span key={part.id} className="rocket__layer" style={sheetStyle(part, flying)} />
      ))}
    </div>
  );
}

/** Small preview of one part, used on its icon button. */
export function PartIcon({ part, lit = false }) {
  if (part.src) {
    return <img className="part__photo" src={part.src} alt="" />;
  }
  return (
    <span className="part__icon">
      <span className="rocket__layer" style={sheetStyle(part, lit)} />
    </span>
  );
}
