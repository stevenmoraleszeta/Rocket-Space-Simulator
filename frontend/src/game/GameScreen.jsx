/**
 * After a mission is launched the player fits the rocket on Earth,
 * then presses Launch and the flight begins.
 */
import { useState } from 'react';
import { SpaceBackground } from '../levels';
import launchPad from '../assets/images/backgrounds/launch_pad.svg';
import { EMPTY_LOADOUT, PARTS } from './parts.js';
import { PartIcon, Rocket } from './Rocket.jsx';
import './game.css';

export function GameScreen({ mission, onExit }) {
  const [phase, setPhase] = useState('assemble');
  const [equipped, setEquipped] = useState(EMPTY_LOADOUT);

  function toggle(id) {
    setEquipped((current) => ({ ...current, [id]: !current[id] }));
  }

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

  if (phase === 'flight') {
    return (
      <SpaceBackground>
        <div className="game">
          {hud}
          <div className="flight">
            <p className="flight__status">Liftoff! Heading to {mission.place}.</p>
            <Rocket equipped={equipped} flying />
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
      <img className="game__bg" src={launchPad} alt="" />
      {hud}
      <div className="bay">
        <div className="bay__rocket">
          <Rocket equipped={equipped} />
          <button type="button" className="ms-btn bay__launch" onClick={() => setPhase('flight')}>
            Launch
          </button>
        </div>
        <ul className="parts">
          {PARTS.map((part) => {
            const on = equipped[part.id];
            return (
              <li key={part.id}>
                <button
                  type="button"
                  className={on ? 'part is-on' : 'part'}
                  aria-pressed={on}
                  onClick={() => toggle(part.id)}
                >
                  <PartIcon part={part} />
                  <span className="part__text">
                    <span className="part__name">{part.name}</span>
                    <span className="part__blurb">{part.blurb}</span>
                  </span>
                  <span className="part__action">{on ? 'Remove' : 'Add'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
