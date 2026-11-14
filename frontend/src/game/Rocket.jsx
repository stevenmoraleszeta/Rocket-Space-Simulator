import { PARTS, ROCKET } from './parts.js';

function sheetStyle(part, scale) {
  return {
    backgroundImage: `url(${part.sheet})`,
    backgroundPosition: `${-part.frameX}px ${-part.frameY}px`,
    backgroundSize: `${part.sheetWidth}px ${part.sheetHeight}px`,
    transform: `scale(${scale})`,
  };
}

/** Pixel rocket with the parts the player chose stacked on the same sprite cell. */
export function Rocket({ equipped, scale = 7, flying = false }) {
  return (
    <div
      className={flying ? 'rocket is-flying' : 'rocket'}
      style={{ '--scale': scale }}
    >
      <span
        className="rocket__layer"
        style={{
          backgroundImage: `url(${ROCKET.src})`,
          backgroundSize: `${ROCKET.frame}px ${ROCKET.frame}px`,
          transform: `scale(${scale})`,
        }}
      />
      {PARTS.filter((part) => part.sheet && equipped[part.id]).map((part) => (
        <span key={part.id} className="rocket__layer" style={sheetStyle(part, scale)} />
      ))}
      {equipped.cargo && (
        <img className="rocket__cargo" src={PARTS.find((part) => part.id === 'cargo').src} alt="" />
      )}
    </div>
  );
}

/** Small preview of one part, used on its toggle. */
export function PartIcon({ part }) {
  if (part.src) {
    return <img className="part__photo" src={part.src} alt="" />;
  }
  return (
    <span className="part__icon">
      <span className="rocket__layer" style={sheetStyle(part, 2)} />
    </span>
  );
}
