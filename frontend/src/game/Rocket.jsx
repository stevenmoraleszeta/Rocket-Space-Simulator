import { PARTS, ROCKET, partCount } from './parts.js';

/** Plays `frames` cells of one sheet row in a loop (see .rocket__layer--anim in game.css). */
function animatedStyle(sheet, sheetWidth, sheetHeight, frameY, frames, firstFrame = 0) {
  return {
    backgroundImage: `url(${sheet})`,
    backgroundSize: `${sheetWidth}px ${sheetHeight}px`,
    backgroundPositionY: `${-frameY}px`,
    '--frames': frames,
    '--first': firstFrame,
  };
}

function rowStyle(row) {
  return animatedStyle(row.sheet, row.sheetWidth, row.sheetHeight, row.frameY, row.frames, row.firstFrame);
}

function sheetStyle(part, lit) {
  const x = lit || part.offX == null ? part.frameX : part.offX;
  const y = lit || part.offY == null ? part.frameY : part.offY;
  return {
    backgroundImage: `url(${part.sheet})`,
    backgroundPosition: `${-x}px ${-y}px`,
    backgroundSize: `${part.sheetWidth}px ${part.sheetHeight}px`,
  };
}

/**
 * Pixel rocket with the parts the player chose stacked on the same sprite cell.
 * flying: flight screen (rises in from below). launching: leaving the launch pad.
 * ascending: climbing through the atmosphere. All of them show the lit, animated engine.
 * stage: 'full' (whole rocket), 'separating' (leaving the atmosphere, the rear stage and the
 * side boosters drop away) or 'upper' (in space: only the short upper stage is left).
 */
export function Rocket({ equipped, flying = false, launching = false, ascending = false, open = false, stage = 'full' }) {
  const lit = flying || launching || ascending;
  const classes = ['rocket'];
  if (flying) classes.push('is-flying');
  if (launching) classes.push('is-launching');
  if (ascending) classes.push('is-ascending');
  if (open) classes.push('rocket--open');

  const separated = stage !== 'full';
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
      {lit && stage === 'separating' ? (
        <span className="rocket__layer rocket__layer--once" style={rowStyle(ROCKET.separation)} />
      ) : lit ? (
        <span
          className="rocket__layer rocket__layer--anim"
          style={rowStyle(stage === 'upper' ? ROCKET.upperStage : ROCKET.flight)}
        />
      ) : (
        <span
          className={open ? 'rocket__layer rocket__hull' : 'rocket__layer'}
          style={{
            backgroundImage: `url(${ROCKET.off})`,
            backgroundSize: `${ROCKET.frame}px ${ROCKET.frame}px`,
          }}
        />
      )}
      {PARTS.filter((part) => part.sheet && partCount(equipped, part.id) > 0)
        .filter((part) => !(stage === 'upper' && part.dropsWithStage))
        .map((part) =>
        separated && part.dropsWithStage ? (
          <span
            key={part.id}
            className="rocket__layer rocket__layer--dropping"
            style={sheetStyle(part, false)}
          />
        ) : lit && part.flightFrames ? (
          <span
            key={part.id}
            className="rocket__layer rocket__layer--anim"
            style={animatedStyle(part.sheet, part.sheetWidth, part.sheetHeight, part.frameY, part.flightFrames)}
          />
        ) : (
          <span key={part.id} className="rocket__layer" style={sheetStyle(part, lit)} />
        ),
      )}
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
