/**
 * After a mission is launched the player fits the rocket on Earth,
 * then presses Launch and the flight begins.
 */
import { useEffect, useState } from 'react';
import { SpaceBackground } from '../levels';
import launchPad from '../assets/images/backgrounds/launch_pad.svg';
import launchBase from '../assets/images/rockets/launch_base.png';
import { EMPTY_LOADOUT, PARTS, partCount, partMax } from './parts.js';
import { METER_ICONS } from './meterIcons.js';
import { PadClouds } from './PadClouds.jsx';
import { PadCrew } from './PadCrew.jsx';
import { LaunchTower } from './LaunchTower.jsx';
import { ASCENT_MS, AscentScene } from './AscentScene.jsx';
import { PartIcon, Rocket } from './Rocket.jsx';
import { partTags, rocketStatus } from './stats.js';
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../audio';
import './game.css';

/**
 * Timed phases after pressing Launch, and what comes next:
 * launching = liftoff from the pad (game.css), ascent = through the atmosphere (ascent.css).
 */
const TIMED_PHASES = {
  launching: { ms: 3600, next: 'ascent' },
  ascent: { ms: ASCENT_MS, next: 'flight' },
};

/**
 * Optional props used by MissionFlow:
 *   onLaunch(equipped)  when given, Launch hands the built rocket to the next stage
 *                       (the orbit trajectory plays the liftoff itself, see LaunchSequence.jsx)
 *   initialEquipped     loadout to start with (keeps the parts when coming back to the hangar)
 */
export function GameScreen({ mission, onExit, onLaunch, initialEquipped }) {
  const [phase, setPhase] = useState('assemble');
  const [storyOpen, setStoryOpen] = useState(true);
  const [openPart, setOpenPart] = useState(null);
  const [equipped, setEquipped] = useState(initialEquipped ?? EMPTY_LOADOUT);

  useEffect(() => {
    if (phase !== 'assemble' || (!storyOpen && !openPart)) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (openPart) setOpenPart(null);
      else setStoryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [storyOpen, openPart, phase]);

  // Pad liftoff → ascent → flight, each step after its animation ends
  useEffect(() => {
    const step = TIMED_PHASES[phase];
    if (!step) return undefined;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setPhase(step.next), reduceMotion ? 500 : step.ms);
    return () => clearTimeout(timer);
  }, [phase]);

  function startLaunch() {
    if (onLaunch) {
      onLaunch(equipped);
      return;
    }
    playSfx(SFX.liftoff);
    setStoryOpen(false);
    setOpenPart(null);
    setPhase('launching');
  }

  const launching = phase === 'launching';

  useSoundtrack(
    phase === 'flight'
      ? { music: MUSIC.flight, ambient: AMBIENCE.space }
      : phase === 'ascent'
        ? { music: MUSIC.flight }
        : { music: MUSIC.assemble },
  );

  function changeCount(id, delta) {
    const part = PARTS.find((item) => item.id === id);
    const max = partMax(part);
    // Sound only when the count really changes (not when already at 0 or at the max)
    const before = partCount(equipped, id);
    const after = Math.max(0, Math.min(max, before + delta));
    if (after > before) playSfx(SFX.equip);
    else if (after < before) playSfx(SFX.unequip);
    setEquipped((current) => {
      const count = Math.max(0, Math.min(max, partCount(current, id) + delta));
      return { ...current, [id]: count };
    });
  }

  const { meters } = rocketStatus(equipped, mission);

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

  if (phase === 'ascent') {
    return <AscentScene equipped={equipped} hud={hud} />;
  }

  if (phase === 'flight') {
    return (
      <SpaceBackground>
        <div className="game">
          {hud}
          <div className="flight">
            <p className="flight__status">Liftoff! Heading to {mission.place}.</p>
            <Rocket equipped={equipped} flying stage="upper" />
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
          <PadClouds />
          <div className="stage__mount">
            <div className="prep">
              <LaunchTower launching={launching} />
              <img className="prep__base" src={launchBase} alt="" />
              <Rocket equipped={equipped} open={!launching} launching={launching} />
              <PadCrew />
            </div>
          </div>
        </div>
      </div>
      {hud}
      <div className="bay" inert={launching}>
        <div className="pad-story">
          <button
            type="button"
            className={storyOpen ? 'bulb is-on' : 'bulb'}
            aria-pressed={storyOpen}
            aria-label={storyOpen ? 'Close the story' : 'Open the story'}
            onClick={() => setStoryOpen((open) => !open)}
          >
            <BulbIcon />
          </button>
        </div>
        <Meters meters={meters} />
        <div className="dock">
          <ul className="parts">
            {PARTS.map((part) => {
              const count = partCount(equipped, part.id);
              const open = openPart === part.id;
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    className={[
                      'part-btn',
                      count > 0 ? 'is-on' : '',
                      open ? 'is-open' : '',
                    ].filter(Boolean).join(' ')}
                    aria-expanded={open}
                    aria-controls={open ? 'part-dialog' : undefined}
                    aria-label={`${part.name}. ${count} packed.`}
                    onClick={() => setOpenPart(open ? null : part.id)}
                  >
                    <PartIcon part={part} lit />
                    {count > 0 && <span className="part-btn__qty">{count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {openPart && (
            <PartDialog
              part={PARTS.find((part) => part.id === openPart)}
              count={partCount(equipped, openPart)}
              onChange={changeCount}
              onClose={() => setOpenPart(null)}
            />
          )}
          <button
            type="button"
            className="bay__launch"
            aria-label="Launch"
            onClick={startLaunch}
          >
            Launch
          </button>
        </div>
      </div>
      {storyOpen && (
        <Briefing mission={mission} onClose={() => setStoryOpen(false)} />
      )}
    </div>
  );
}

/** Story and clues. Opens from the light bulb and stays inside the screen. */
function Briefing({ mission, onClose }) {
  const hints = mission.hints ?? [];

  return (
    <div
      className="brief-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="brief-shell">
        <section
          className="brief"
          role="dialog"
          aria-modal="true"
          aria-labelledby="brief-title"
        >
          <header className="brief__head">
            <div className="brief__heading">
              <p className="brief__kicker">Mission {mission.number} · {mission.place}</p>
              <h2 id="brief-title" className="brief__title">Story</h2>
            </div>
            <button type="button" className="brief__close" onClick={onClose}>
              Close
            </button>
          </header>
          {mission.intro && <p className="brief__intro">{mission.intro}</p>}
          <div className="brief__body">
            <div className="brief__story">
              {(mission.story ?? []).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            {hints.length > 0 && (
              <aside className="brief__hints">
                <h3>Clues</h3>
                <ol>
                  {hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ol>
              </aside>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function BulbIcon() {
  return (
    <svg className="bulb__icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1a4.5 4.5 0 0 0-2.5 8.2V11h5V9.2A4.5 4.5 0 0 0 8 1zm-1 11h2v1H7v-1zm.5 2h1v1h-1v-1zM1 6h2v1H1V6zm12 0h2v1h-2V6zM2.2 2.2l1.4 1.4-.7.7L1.5 2.9l.7-.7zm10.2 0 .7.7-1.4 1.4-.7-.7 1.4-1.4z"
      />
    </svg>
  );
}

/** Detail for one part. Opens on the right, next to the icon row. */
function PartDialog({ part, count, onChange, onClose }) {
  if (!part) return null;
  const max = partMax(part);

  return (
    <section
      className="part-dialog"
      id="part-dialog"
      role="dialog"
      aria-labelledby="part-dialog-title"
    >
      <div className="part-dialog__head">
        <h2 id="part-dialog-title" className="part-dialog__title">{part.name}</h2>
        <button type="button" className="part-dialog__close" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="part-dialog__blurb">{part.blurb}</p>
      <p className="part__tags">
        {partTags(part).map((tag) => (
          <span key={tag.text} className={`part__tag part__tag--${tag.kind}`}>{tag.text}</span>
        ))}
      </p>
      <div className="part-dialog__stepper">
        <button
          type="button"
          className="step-btn"
          disabled={count <= 0}
          aria-label={`Remove one ${part.name}`}
          onClick={() => onChange(part.id, -1)}
        >
          −
        </button>
        <span className="part-dialog__count" aria-live="polite">{count} / {max}</span>
        <button
          type="button"
          className="step-btn"
          disabled={count >= max}
          aria-label={`Add one ${part.name}`}
          onClick={() => onChange(part.id, 1)}
        >
          +
        </button>
      </div>
    </section>
  );
}

/** Budget, mass, energy, and the supplies the mission asks for. */
function Meters({ meters }) {
  return (
    <section className="meters" aria-label="Rocket supplies">
      <h2 className="meters__title">Supplies</h2>
      <div className="meters__grid">
        {meters.map((meter) => (
          // Only the budget colors its bar (ok / low / over). The other bars all share one color
          // and show just the number, so kids find the right amounts by trying
          <div key={meter.id} className={meter.bar ? `meter is-${meter.tone}` : 'meter is-plain'}>
            {METER_ICONS[meter.id] && (
              <img className="meter__icon" src={METER_ICONS[meter.id]} alt="" />
            )}
            <div className="meter__body">
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
          </div>
        ))}
      </div>
    </section>
  );
}
