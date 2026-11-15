import explosionSheet from '../assets/images/rockets/animations/explosion_sheet.png';
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
 * stage: 'full' (whole rocket), 'separating' (leaving the atmosphere: the rear stage and the
 * side boosters drop away and the heat shield cracks in two) or 'upper' (in space: only the
 * short upper stage is left).
 * straining: the engines roar but the rocket cannot lift (no boosters): it only shakes.
 * returning: called home (the crew has no food): it turns around and gently sinks out of view.
 * exploding: the rocket blows up (8 frames of explosion_sheet.png, played once) and is gone.
 */
export function Rocket({
  equipped,
  flying = false,
  launching = false,
  ascending = false,
  open = false,
  stage = 'full',
  straining = false,
  returning = false,
  exploding = false,
}) {
  if (exploding) {
    return (
      <div className="rocket is-exploding" role="img" aria-label="The rocket explodes">
        <span
          className="rocket__layer rocket__layer--explosion"
          style={{ backgroundImage: `url(${explosionSheet})`, backgroundSize: '256px 64px' }}
        />
      </div>
    );
  }

  const lit = flying || launching || ascending || straining;
  const classes = ['rocket'];
  if (flying) classes.push('is-flying');
  if (launching) classes.push('is-launching');
  if (straining) classes.push('is-straining');
  if (returning) classes.push('is-returning');
  if (ascending) classes.push('is-ascending');
  if (open) classes.push('rocket--open');

  const separated = stage !== 'full';
  const interior = PARTS.filter((part) => part.inside && partCount(equipped, part.id) > 0);

  return (
    <div className={classes.join(' ')}>
      {/* What rides inside, in a speech bubble beside the closed hull */}
      {open && interior.length > 0 && (
        <div className="rocket__bubble" aria-label="Inside the rocket">
          {interior.map((part) => (
            <span key={part.id} className="rocket__cargo-row">
              <img
                className={part.id === 'astronaut' ? 'rocket__cargo rocket__cargo--astronaut' : 'rocket__cargo'}
                src={part.src}
                alt=""
              />
              <span className="rocket__cargo-name">{part.name}</span>
              <span className="rocket__qty">×{partCount(equipped, part.id)}</span>
            </span>
          ))}
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
          className="rocket__layer"
          style={{
            backgroundImage: `url(${open ? ROCKET.hangar : ROCKET.off})`,
            backgroundSize: `${ROCKET.frame}px ${ROCKET.frame}px`,
          }}
        />
      )}
      {PARTS.filter((part) => part.sheet && partCount(equipped, part.id) > 0)
        .filter((part) => !(stage === 'upper' && (part.dropsWithStage || part.breaksOnSeparation)))
        .map((part) =>
        separated && part.breaksOnSeparation ? (
          <span key={part.id} className="rocket__shell" aria-hidden="true">
            <span className="rocket__layer rocket__shell-half rocket__shell-half--left" style={sheetStyle(part, true)} />
            <span className="rocket__layer rocket__shell-half rocket__shell-half--right" style={sheetStyle(part, true)} />
            <span className="rocket__layer rocket__shell-flash" />
          </span>
        ) : separated && part.dropsWithStage ? (
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
