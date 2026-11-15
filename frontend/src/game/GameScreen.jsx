/**
 * After a mission is launched the player fits the rocket on Earth,
 * then presses Launch and the flight begins.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SpaceBackground, useProgress } from '../levels';
import launchPad from '../assets/images/backgrounds/launch_pad.svg';
import launchBase from '../assets/images/rockets/launch_base.png';
import { EMPTY_LOADOUT, partCount, partMax, partsForMission } from './parts.js';
import { METER_ICONS } from './meterIcons.js';
import { PadClouds } from './PadClouds.jsx';
import { PadFlag } from './PadFlag.jsx';
import { PadCrew } from './PadCrew.jsx';
import { LaunchTower } from './LaunchTower.jsx';
import { LaunchSequence } from './LaunchSequence.jsx';
import { flightNotes } from './flightSummary.js';
import { flightSupplyFailure, launchFailure } from './launchFailure.js';
import { FlightReadout } from './FlightReadout.jsx';
import { flightReadout, supplyReport } from './lifeSupport.js';
import { ASCENT_MS, AscentScene } from './AscentScene.jsx';
import { PartIcon, Rocket } from './Rocket.jsx';
import { partTags, rocketStatus } from './stats.js';
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../audio';
import { useSettings } from '../settings/SettingsContext.jsx';
import { engineerName, sayTo } from '../settings/settingsStore.js';
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
  const playerName = engineerName(useSettings().playerName);
  const { completeMission } = useProgress();
  const loggedTrip = useRef(false);
  const [phase, setPhase] = useState('assemble');
  const [storyOpen, setStoryOpen] = useState(true);
  const [openPart, setOpenPart] = useState(null);
  const [equipped, setEquipped] = useState(initialEquipped ?? EMPTY_LOADOUT);
  const [flightSeconds, setFlightSeconds] = useState(0);
  const [flightHeld, setFlightHeld] = useState(false);

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

  // A bad loadout blows up on the pad or in the air (launchFailure.js).
  // Food and oxygen that run out later fail on the flight clock.
  const [failure, setFailure] = useState(null);

  const recordTrip = useCallback((success) => {
    if (onLaunch || loggedTrip.current) return;
    loggedTrip.current = true;
    try {
      completeMission(mission.id, {
        pct: success ? 100 : 0,
        success,
        flight: flightNotes(equipped, { place: mission.place }),
      });
    } catch {
      /* mission locked or unknown: the flight screen still explains what happened */
    }
  }, [onLaunch, completeMission, mission, equipped]);

  function returnToHangar() {
    loggedTrip.current = false;
    setFlightHeld(false);
    setFlightSeconds(0);
    setFailure(null);
    setPhase('assemble');
  }

  function startLaunch() {
    if (onLaunch) {
      onLaunch(equipped);
      return;
    }
    playSfx(SFX.liftoff);
    setStoryOpen(false);
    setOpenPart(null);
    setFlightSeconds(0);
    setFlightHeld(false);
    const willFail = launchFailure(equipped, mission);
    setFailure(willFail);
    setPhase(willFail ? 'failing' : 'launching');
  }

  // Moon and Mars play the whole trip here. The clock covers the real mission length
  // in a few seconds, and food and oxygen drop at NASA rates.
  useEffect(() => {
    if (phase !== 'flight') return undefined;
    const duration = mission?.loadout?.durationSeconds ?? 0;
    const supplyFailure = flightSupplyFailure(equipped, mission);
    const watchMs = 20000;
    const started = performance.now();
    let frame = 0;
    const tick = (now) => {
      const elapsed = Math.min(duration, ((now - started) / watchMs) * duration);
      setFlightSeconds(elapsed);
      if (supplyFailure && elapsed >= supplyFailure.atSeconds) {
        playSfx(SFX.lose);
        setFailure(supplyFailure);
        recordTrip(false);
        setPhase('failed');
        return;
      }
      if (elapsed >= duration) {
        setFlightHeld(true);
        recordTrip(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, equipped, mission, recordTrip]);

  const showFailure = useCallback(() => {
    playSfx(SFX.lose);
    recordTrip(false);
    setPhase('failed');
  }, [recordTrip]);

  const launching = phase === 'launching';

  useSoundtrack(
    phase === 'flight'
      ? { music: MUSIC.flight, ambient: AMBIENCE.space }
      : phase === 'ascent'
        ? { music: MUSIC.flight }
        : { music: MUSIC.assemble },
  );

  const catalog = useMemo(() => partsForMission(mission.id), [mission.id]);
  const supplies = supplyReport(equipped, mission);
  const creditsLeft = supplies.limits.budget - supplies.cost;

  function changeCount(id, delta) {
    const part = catalog.find((item) => item.id === id);
    if (!part) return;
    const max = partMax(part);
    const before = partCount(equipped, id);
    const after = Math.max(0, Math.min(max, before + delta));
    if (after === before) return;
    if (after > before && creditsLeft < part.cost) return;
    if (after > before) playSfx(SFX.equip);
    else playSfx(SFX.unequip);
    setEquipped((current) => {
      const count = Math.max(0, Math.min(max, partCount(current, id) + delta));
      if (count > partCount(current, id)) {
        const report = supplyReport(current, mission);
        if (report.limits.budget - report.cost < part.cost) return current;
      }
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
        {playerName && <p className="game__engineer">Engineer {playerName}</p>}
      </div>
      <div className="game__place">{mission.place}</div>
    </header>
  );

  if (phase === 'failing') {
    return <LaunchSequence equipped={equipped} hud={hud} failure={failure} onFail={showFailure} />;
  }

  if (phase === 'failed') {
    return (
      <SpaceBackground>
        <div className="game">
          {hud}
          <div className="flight launch-failed" role="alert">
            <h2 className="launch-failed__title">{playerName ? sayTo(playerName, 'Try again') : 'Try again'}</h2>
            <p className="flight__status">{failure?.message}</p>
            <p className="launch-failed__hint">{failure?.hint}</p>
            <button type="button" className="ms-btn" onClick={returnToHangar}>
              Back to the hangar
            </button>
          </div>
        </div>
      </SpaceBackground>
    );
  }

  if (phase === 'ascent') {
    return <AscentScene equipped={equipped} hud={hud} />;
  }

  if (phase === 'flight') {
    return (
      <SpaceBackground>
        <div className="game">
          {hud}
          <div className="flight">
            <p className="flight__status">
              {flightHeld
                ? sayTo(playerName, 'The crew made it. Food, air, and power held for the whole trip.')
                : sayTo(playerName, `Liftoff! Heading to ${mission.place}.`)}
            </p>
            <Rocket equipped={equipped} flying stage="upper" />
            <FlightReadout
              rows={flightReadout(equipped, mission, flightSeconds, { altitudeMeters: 400000, speedMetersPerSecond: 0 })}
            />
            <button type="button" className="game__back" onClick={returnToHangar}>
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
          <PadFlag />
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
            <span className="bulb__label">Story</span>
          </button>
        </div>
        <Meters meters={meters} />
        <div className="dock">
          <ul className={catalog.length > 6 ? 'parts parts--wrap' : 'parts'}>
            {catalog.map((part) => {
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
              part={catalog.find((part) => part.id === openPart)}
              count={partCount(equipped, openPart)}
              creditsLeft={creditsLeft}
              onChange={changeCount}
              onClose={() => setOpenPart(null)}
            />
          )}
          <button
            type="button"
            className="bay__launch"
            aria-label={onLaunch ? 'Aim the rocket' : 'Launch'}
            onClick={startLaunch}
          >
            {onLaunch ? 'Aim' : 'Launch'}
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
  const playerName = engineerName(useSettings().playerName);
  const story = mission.story ?? [];

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
              <p className="brief__kicker">
                {playerName ? `Engineer ${playerName}` : `Mission ${mission.number}`} · {mission.place}
              </p>
              <h2 id="brief-title" className="brief__title">Story</h2>
            </div>
            <button type="button" className="brief__close" onClick={onClose}>
              Close
            </button>
          </header>
          {mission.intro && <p className="brief__intro">{mission.intro}</p>}
          <div className="brief__body">
            <div className="brief__story">
              {story.map((line, index) => (
                <p key={line}>{index === 0 ? sayTo(playerName, line) : line}</p>
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
function PartDialog({ part, count, creditsLeft, onChange, onClose }) {
  const [denied, setDenied] = useState(false);
  const denyTimer = useRef(null);

  useEffect(() => () => clearTimeout(denyTimer.current), []);
  useEffect(() => setDenied(false), [part?.id]);

  if (!part) return null;
  const max = partMax(part);
  const broke = creditsLeft < part.cost;

  function tryAdd() {
    if (count >= max) return;
    if (!broke) {
      setDenied(false);
      onChange(part.id, 1);
      return;
    }
    setDenied(true);
    playSfx(SFX.error);
    clearTimeout(denyTimer.current);
    denyTimer.current = setTimeout(() => setDenied(false), 700);
  }

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
          className={denied ? 'step-btn is-denied' : 'step-btn'}
          disabled={count >= max}
          title={broke && count < max ? 'Not enough money' : undefined}
          aria-label={`Add one ${part.name}`}
          onClick={tryAdd}
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
          // Only money colors its bar. The other amounts share one color, so the hangar
          // does not say whether they are enough before liftoff.
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
