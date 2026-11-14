/**
 * After a mission is launched the player fits the rocket on Earth,
 * then presses Launch and the flight begins.
 */
import { useState } from 'react';
import { SpaceBackground } from '../levels';
import launchPad from '../assets/images/backgrounds/launch_pad.svg';
import launchBase from '../assets/images/rockets/launch_base.png';
import { EMPTY_LOADOUT, PARTS, partCount, partMax } from './parts.js';
import { PadCrew } from './PadCrew.jsx';
import { PartIcon, Rocket } from './Rocket.jsx';
import { partTags, rocketStatus } from './stats.js';
import './game.css';

export function GameScreen({ mission, onExit }) {
  const [phase, setPhase] = useState('story');
  const [equipped, setEquipped] = useState(EMPTY_LOADOUT);

  function changeCount(id, delta) {
    const part = PARTS.find((item) => item.id === id);
    const max = partMax(part);
    setEquipped((current) => {
      const count = Math.max(0, Math.min(max, partCount(current, id) + delta));
      return { ...current, [id]: count };
    });
  }

  const { meters, problems } = rocketStatus(equipped, mission);
  const ready = problems.length === 0;

  const hud = (
    <header className="game__hud">
      <button type="button" className="game__back" onClick={onExit}>
        Missions
      </button>
      <div className="game__mission">
        <div className="game__num">Mission {mission.number}</div>
        <h1>{mission.title}</h1>
      </div>
      <div className="game__place">{mission.place}</div>
    </header>
  );

  if (phase === 'story') {
    return (
      <SpaceBackground>
        <div className="game">
          {hud}
          <Briefing mission={mission} onReady={() => setPhase('assemble')} />
        </div>
      </SpaceBackground>
    );
  }

  if (phase === 'flight') {
    return (
      <SpaceBackground>
        <div className="game">
          {hud}
          <div className="flight">
            <p className="flight__status">Liftoff! Heading to {mission.place}.</p>
            <Rocket equipped={equipped} flying />
            <Meters meters={meters} />
            <button type="button" className="game__back" onClick={() => setPhase('assemble')}>
              Hangar
            </button>
          </div>
        </div>
      </SpaceBackground>
    );
  }

  return (
    <div className="game game--pad">
      <div className="stage">
        <div className="stage__frame">
          <img className="stage__bg" src={launchPad} alt="" />
          <div className="stage__mount">
            <div className="prep">
              <img className="prep__base" src={launchBase} alt="" />
              <Rocket equipped={equipped} open />
              <PadCrew />
            </div>
          </div>
        </div>
      </div>
      {hud}
      <div className="bay">
        <div className="bay__tools">
          <button type="button" className="game__back" onClick={() => setPhase('story')}>
            Story
          </button>
        </div>
        <Clues hints={mission.hints} />
        <Meters meters={meters} />
        <ul className="parts">
          {PARTS.map((part) => {
            const count = partCount(equipped, part.id);
            const max = partMax(part);
            return (
              <li key={part.id}>
                <div className={count > 0 ? 'part is-on' : 'part'}>
                  <PartIcon part={part} />
                  <span className="part__text">
                    <span className="part__name">{part.name}</span>
                    <span className="part__blurb">{part.blurb}</span>
                    <span className="part__tags">
                      {partTags(part).map((tag) => (
                        <span key={tag.text} className={`part__tag part__tag--${tag.kind}`}>{tag.text}</span>
                      ))}
                    </span>
                  </span>
                  <span className="part__stepper">
                    <button
                      type="button"
                      className="part__step"
                      disabled={count <= 0}
                      aria-label={`Remove one ${part.name}`}
                      onClick={() => changeCount(part.id, -1)}
                    >
                      −
                    </button>
                    <span className="part__count" aria-live="polite">{count}</span>
                    <button
                      type="button"
                      className="part__step"
                      disabled={count >= max}
                      aria-label={`Add one ${part.name}`}
                      onClick={() => changeCount(part.id, 1)}
                    >
                      +
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="ms-btn bay__launch"
          disabled={!ready}
          aria-label={ready ? 'Launch' : `Launch. ${problems.join('. ')}`}
          onClick={() => setPhase('flight')}
        >
          {ready ? 'Launch' : problems[0]}
        </button>
      </div>
    </div>
  );
}

/** Short story and clues, shown before the player packs the rocket. */
function Briefing({ mission, onReady }) {
  return (
    <section className="brief" aria-labelledby="brief-title">
      <h2 id="brief-title" className="brief__title">Story</h2>
      {mission.intro && <p className="brief__intro">{mission.intro}</p>}
      <div className="brief__story">
        {(mission.story ?? []).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="brief__hints">
        <h3>Clues</h3>
        <ol>
          {(mission.hints ?? []).map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ol>
      </div>
      <button type="button" className="ms-btn" onClick={onReady}>
        Pack the rocket
      </button>
    </section>
  );
}

/** Clues stay one tap away while the rocket is being packed. */
function Clues({ hints }) {
  if (!hints?.length) return null;
  return (
    <details className="clues">
      <summary>Clues</summary>
      <ol>
        {hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ol>
    </details>
  );
}

/** Budget, mass, energy, and the supplies the mission asks for. */
function Meters({ meters }) {
  return (
    <section className="meters" aria-label="Rocket supplies">
      <h2 className="meters__title">Supplies</h2>
      <p className="meters__hint">Green bars are ready. Yellow bars still need help.</p>
      <div className="meters__grid">
        {meters.map((meter) => (
          <div key={meter.id} className={`meter is-${meter.tone}`}>
            <div className="meter__top">
              <span className="meter__label">{meter.label}</span>
              <span className="meter__value">{meter.text}</span>
            </div>
            <div
              className="meter__track"
              role="meter"
              aria-label={meter.label}
              aria-valuemin={0}
              aria-valuemax={meter.max}
              aria-valuenow={meter.current}
              aria-valuetext={`${meter.label}: ${meter.text}`}
            >
              <span className="meter__fill" style={{ clipPath: `inset(0 ${100 - meter.fill}% 0 0)` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
