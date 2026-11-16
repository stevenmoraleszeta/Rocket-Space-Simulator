/**
 * After a mission is launched the player fits the rocket on Earth,
 * then presses Launch and the flight begins.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SpaceBackground, useProgress } from '../levels';
import launchPad from '../assets/images/backgrounds/launch_pad.svg';
import sunGlow from '../assets/images/backgrounds/sun_glow.svg';
import launchBase from '../assets/images/rockets/launch_base.png';
import { EMPTY_LOADOUT, partCount, partMax, partsForMission } from './parts.js';
import { METER_ICONS } from './meterIcons.js';
import { PadClouds } from './PadClouds.jsx';
import { PadFlag } from './PadFlag.jsx';
import { PadCrew } from './PadCrew.jsx';
import { LaikaStory, PadLaika } from './PadLaika.jsx';
import { TutorialButton, TutorialGuide } from './tutorial/TutorialGuide.jsx';
import { useTutorial } from './tutorial/tutorialStore.js';
import { FunFactToast } from './FunFactToast.jsx';
import { LaunchTower } from './LaunchTower.jsx';
import { LaunchSequence } from './LaunchSequence.jsx';
import { UPGRADE_GROW } from './rendering/upgradedRocket.js';
import { flightNotes } from './flightSummary.js';
import { MissionFailedScreen } from './levels/orbit/MissionFailedScreen.jsx';
import { flightSupplyFailure, launchFailure } from './launchFailure.js';
import { FlightReadout } from './FlightReadout.jsx';
import { flightReadout, supplyReport } from './lifeSupport.js';
import { ASCENT_MS, AscentScene } from './AscentScene.jsx';
import { PartIcon, Rocket } from './Rocket.jsx';
import { partTags, rocketStatus } from './stats.js';
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../audio';
import { t } from '../i18n/index.js';
import { failureHint, failureMessage } from '../i18n/text.js';
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
  // Called home (no food): the rocket comes back down and lands, then the "You lose" screen
  returning: { ms: 3200, next: 'failed' },
};

/** Upgrade swap: the crane drops its hook and hoists the rocket away, then lowers the new one. */
const SWAP_OUT_MS = 1400;
const SWAP_IN_MS = 1700;

/**
 * Optional props used by MissionFlow:
 *   onLaunch(equipped)  when given, Launch hands the built rocket to the next stage
 *                       (the orbit trajectory plays the liftoff itself, see LaunchSequence.jsx)
 *   initialEquipped     loadout to start with (keeps the parts when coming back to the hangar)
 *   onEquippedChange    reports the fitted parts so the URL can restore them
 */
export function GameScreen({ mission, onExit, onLaunch, initialEquipped, onEquippedChange }) {
  const playerName = engineerName(useSettings().playerName);
  const { completeMission } = useProgress();
  const loggedTrip = useRef(false);
  const [phase, setPhase] = useState('assemble');
  // The story starts closed: the light bulb opens it, and blinks until it is tapped once.
  const [storyOpen, setStoryOpen] = useState(false);
  const [storySeen, setStorySeen] = useState(false);
  // Optional Tutorial (mission 1): hands and arrows over the real buttons, no text
  const [tutorialOn, setTutorialOn] = useTutorial();
  const tutorialMission = mission.id === 'earth';
  const [openPart, setOpenPart] = useState(null);
  const [partAnchor, setPartAnchor] = useState(null);
  const sidePopout = useWideScreen();
  const [laikaTalking, setLaikaTalking] = useState(false);
  const [equipped, setEquipped] = useState(initialEquipped ?? EMPTY_LOADOUT);
  useEffect(() => {
    onEquippedChange?.(equipped);
  }, [equipped, onEquippedChange]);
  const [flightSeconds, setFlightSeconds] = useState(0);
  const [flightHeld, setFlightHeld] = useState(false);
  // Upgrade swap on the pad: a crane hoists the rocket away ('out'), then lowers the new one
  // ('in'). `big` is the size the rocket ends up. Matches the prep-swap keyframes in game.css.
  const [swap, setSwap] = useState(null);

  useEffect(() => {
    if (!swap) return undefined;
    const timer = setTimeout(
      () => setSwap(swap.step === 'out' ? { step: 'in', big: swap.big } : null),
      swap.step === 'out' ? SWAP_OUT_MS : SWAP_IN_MS,
    );
    return () => clearTimeout(timer);
  }, [swap]);

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
    if (swap) return;
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
        setFailure(supplyFailure);
        recordTrip(false);
        if (supplyFailure.returnsHome) {
          playSfx(SFX.lose);
          setPhase('returning');
        } else {
          playSfx(SFX.lose);
          setPhase('failed');
        }
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

  // Moon and Mars: a bigger rocket for credits (lifeSupport.js, loadout.upgrade)
  const upgrade = supplies.upgrade;
  const upgraded = supplies.upgraded;
  const canUpgrade = upgraded || creditsLeft >= (upgrade?.cost ?? 0);
  function toggleUpgrade() {
    if (!upgrade || !canUpgrade || swap) return;
    playSfx(upgraded ? SFX.unequip : SFX.equip);
    setEquipped((current) => ({ ...current, upgrade: partCount(current, 'upgrade') > 0 ? 0 : 1 }));
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) setSwap({ step: 'out', big: !upgraded });
  }
  // While the crane swaps rockets, the old size goes up and the new size comes down
  const rocketBig = swap ? (swap.step === 'out' ? !swap.big : swap.big) : upgraded;


  // Tutorial: star the parts the trip needs, then point at the next one to pack
  // (tap it, then tap +), and at Aim once they are all aboard.
  const neededParts = (mission.checklist?.required ?? []).map((item) => item.part);
  const tutorialMarks = neededParts.map((id) => `[data-tutorial='part-${id}']`);
  const missingPart = neededParts.find((id) => partCount(equipped, id) === 0);
  const tutorialTarget = missingPart
    ? openPart === missingPart
      ? "[data-tutorial='part-add']"
      : `[data-tutorial='part-${missingPart}']`
    : "[data-tutorial='aim']";

  const hud = (
    <header className="game__hud">
      {/* Missions, and under it the story light bulb: the story only opens when it is tapped. */}
      <div className="game__corner">
        <button type="button" className="game__back" onClick={onExit}>
          {t('Missions')}
        </button>
        {phase === 'assemble' && (
          <button
            type="button"
            className={storyOpen ? 'bulb is-on' : storySeen ? 'bulb' : 'bulb is-new'}
            aria-pressed={storyOpen}
            aria-label={storyOpen ? t('Close the story') : t('Open the story')}
            onClick={() => {
              setStorySeen(true);
              setStoryOpen((open) => !open);
            }}
          >
            <BulbIcon />
            <span className="bulb__label">{t('Story')}</span>
          </button>
        )}
        {phase === 'assemble' && tutorialMission && <TutorialButton on={tutorialOn} onToggle={setTutorialOn} />}
      </div>
      <div className="game__mission">
        <h1>{t(mission.title)}</h1>
        {playerName && <p className="game__engineer">{t('Engineer {{name}}', { name: playerName })}</p>}
      </div>
      <div className="game__place">{t(mission.place)}</div>
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
          <MissionFailedScreen
            mission={mission}
            result={{ outcome: { type: failure?.id }, success: false }}
            reason={sayTo(playerName, failureMessage(failure))}
            hint={failureHint(failure)}
            onHangar={returnToHangar}
          />
        </div>
      </SpaceBackground>
    );
  }

  if (phase === 'ascent') {
    return <AscentScene equipped={equipped} hud={hud} />;
  }

  if (phase === 'flight' || phase === 'returning') {
    const goingHome = phase === 'returning';
    return (
      <SpaceBackground>
        <div className="game">
          {hud}
          <div className="flight">
            <p className="flight__status">
              {goingHome
                ? sayTo(playerName, t('The crew is too weak to go on. Mission control is bringing them home.'))
                : flightHeld
                  ? sayTo(playerName, t('The crew made it. Food, air, and power held for the whole trip.'))
                  : sayTo(playerName, t('Liftoff! Heading to {{place}}.', { place: t(mission.place) }))}
            </p>
            <Rocket
              equipped={equipped}
              flying
              stage="upper"
              returning={goingHome}
            />
            <FlightReadout
              rows={flightReadout(equipped, mission, flightSeconds, { altitudeMeters: 400000, speedMetersPerSecond: 0 })}
            />
            <button type="button" className="game__back" onClick={returnToHangar}>
              {t('Hangar')}
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
          <img className="stage__glow" src={sunGlow} alt="" />
          <PadClouds />
          <PadFlag />
          <div className="stage__mount">
            <div className="prep">
              <LaunchTower launching={launching} />
              <img className="prep__base" src={launchBase} alt="" />
              <div
                className={swap ? `prep__swap is-${swap.step}` : 'prep__swap'}
                style={{ '--grow': rocketBig ? UPGRADE_GROW : 1 }}
              >
                {swap && <span className="prep__cable" aria-hidden="true" />}
                <Rocket equipped={equipped} open={!launching && !swap} launching={launching} grown={rocketBig} />
              </div>
              {swap?.step === 'in' && <span className="prep__dust" aria-hidden="true" />}
              {/* Laika only waits on the pad for the Moon mission. Before PadCrew, so at the same
                  z-index she walks behind the engineers instead of over them. */}
              {mission.id === 'moon' && (
                <PadLaika talking={laikaTalking} launching={launching} onTalk={() => setLaikaTalking(true)} />
              )}
              <PadCrew />
            </div>
          </div>
        </div>
      </div>
      {hud}
      <div className="bay" inert={launching}>
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
                    data-tutorial={`part-${part.id}`}
                    aria-label={t('{{name}}. {{count}} packed.', { name: t(part.name), count })}
                    onClick={(event) => {
                      setOpenPart(open ? null : part.id);
                      setPartAnchor(open ? null : event.currentTarget);
                    }}
                  >
                    <PartIcon part={part} lit />
                    {count > 0 && <span className="part-btn__qty">{count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {openPart && !sidePopout && (
            <PartDialog
              part={catalog.find((part) => part.id === openPart)}
              count={partCount(equipped, openPart)}
              creditsLeft={creditsLeft}
              onChange={changeCount}
              onClose={() => setOpenPart(null)}
            />
          )}
          {upgrade && (
            <button
              type="button"
              className={upgraded ? 'bay__upgrade is-on' : 'bay__upgrade'}
              aria-pressed={upgraded}
              disabled={!canUpgrade || Boolean(swap)}
              title={upgraded
                ? t('Take the upgrade off and get the credits back')
                : t('A bigger rocket: +{{pct}}% mass and power', { pct: upgrade.pct })}
              onClick={toggleUpgrade}
            >
              <span className="bay__upgrade-name">{upgraded ? t('Upgraded') : t('Upgrade')}</span>
              <span className="bay__upgrade-info">
                {upgraded
                  ? t('+{{pct}}% cargo · on', { pct: upgrade.pct })
                  : t('+{{pct}}% cargo · {{cost}} cr', { pct: upgrade.pct, cost: upgrade.cost })}
              </span>
            </button>
          )}
          <button
            type="button"
            className="bay__launch"
            data-tutorial="aim"
            aria-label={onLaunch ? t('Aim the rocket') : t('Launch')}
            onClick={startLaunch}
          >
            {onLaunch ? t('Aim') : t('Launch')}
          </button>
        </div>
      </div>
      {openPart && sidePopout && !launching && (
        <PartDialog
          part={catalog.find((part) => part.id === openPart)}
          count={partCount(equipped, openPart)}
          creditsLeft={creditsLeft}
          onChange={changeCount}
          onClose={() => setOpenPart(null)}
          anchor={partAnchor}
        />
      )}
      {storyOpen && (
        <Briefing mission={mission} onClose={() => setStoryOpen(false)} />
      )}
      {laikaTalking && !launching && <LaikaStory onClose={() => setLaikaTalking(false)} />}
      <FunFactToast paused={launching || storyOpen || laikaTalking || tutorialOn} />
      {tutorialMission && tutorialOn && phase === 'assemble' && !storyOpen && !laikaTalking && !swap && (
        <TutorialGuide target={tutorialTarget} marks={tutorialMarks} />
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
                {playerName
                  ? t('Engineer {{name}}', { name: playerName })
                  : t('Mission {{number}}', { number: mission.number })} · {t(mission.place)}
              </p>
              <h2 id="brief-title" className="brief__title">{t('Story')}</h2>
            </div>
            <button type="button" className="brief__close" onClick={onClose}>
              {t('Close')}
            </button>
          </header>
          {mission.intro && <p className="brief__intro">{t(mission.intro)}</p>}
          <div className="brief__body">
            <div className="brief__story">
              {story.map((line, index) => (
                <p key={line}>{index === 0 ? sayTo(playerName, t(line)) : t(line)}</p>
              ))}
            </div>
            {hints.length > 0 && (
              <aside className="brief__hints">
                <h3>{t('Clues')}</h3>
                <ol>
                  {hints.map((hint) => (
                    <li key={hint}>{t(hint)}</li>
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

/** True on screens wide enough to show the part card beside the panel. */
const SIDE_POPOUT_QUERY = '(min-width: 721px)';
function useWideScreen() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(SIDE_POPOUT_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(SIDE_POPOUT_QUERY);
    const update = () => setWide(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}

/** Gap between the card and the panel, where the card's tail points at the tapped part. */
const POPOUT_GAP = 16;

/**
 * Keeps the card beside the panel, level with the tapped part button (anchor), and inside the
 * screen. It follows the button when the panel scrolls or the window changes size.
 */
function usePopoutPlace(cardRef, anchor) {
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    if (!anchor) return undefined;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const card = cardRef.current;
        if (!card) return;
        const button = anchor.getBoundingClientRect();
        const panel = (anchor.closest('.dock') ?? anchor).getBoundingClientRect();
        const height = card.offsetHeight;
        const middle = button.top + button.height / 2;
        const top = Math.max(8, Math.min(window.innerHeight - height - 8, middle - 36));
        const tail = Math.max(14, Math.min(height - 28, middle - top - 9));
        setPlace({ right: window.innerWidth - panel.left + POPOUT_GAP, top, tail });
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const observer = new ResizeObserver(update);
    if (cardRef.current) observer.observe(cardRef.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      observer.disconnect();
    };
  }, [anchor, cardRef]);
  return place;
}

/**
 * Detail for one part, with its icon. On wide screens (anchor given) it pops out beside the
 * panel, level with the tapped part, with a tail pointing at it; on phones it sits under the icons.
 */
function PartDialog({ part, count, creditsLeft, onChange, onClose, anchor = null }) {
  const [denied, setDenied] = useState(false);
  const denyTimer = useRef(null);
  const cardRef = useRef(null);
  const place = usePopoutPlace(cardRef, anchor);

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
      ref={cardRef}
      className={anchor ? 'part-dialog part-dialog--popout' : 'part-dialog'}
      id="part-dialog"
      role="dialog"
      aria-labelledby="part-dialog-title"
      style={anchor ? {
        right: place?.right ?? 0,
        top: place?.top ?? 0,
        '--tail-y': `${place?.tail ?? 20}px`,
        visibility: place ? 'visible' : 'hidden',
      } : undefined}
    >
      <div className="part-dialog__head">
        <span className="part-dialog__icon" aria-hidden="true">
          <PartIcon part={part} lit />
        </span>
        <h2 id="part-dialog-title" className="part-dialog__title">{t(part.name)}</h2>
        <button type="button" className="part-dialog__close" onClick={onClose}>
          {t('Close')}
        </button>
      </div>
      <p className="part-dialog__blurb">{t(part.blurb)}</p>
      <p className="part__tags">
        {partTags(part).map((tag) => (
          <span key={tag.phrase} className={`part__tag part__tag--${tag.kind}`}>{t(tag.phrase, tag.vars)}</span>
        ))}
      </p>
      <div className="part-dialog__stepper">
        <button
          type="button"
          className="step-btn"
          disabled={count <= 0}
          aria-label={t('Remove one {{name}}', { name: t(part.name) })}
          onClick={() => onChange(part.id, -1)}
        >
          −
        </button>
        <span className="part-dialog__count" aria-live="polite">{count} / {max}</span>
        <button
          type="button"
          className={denied ? 'step-btn is-denied' : 'step-btn'}
          disabled={count >= max}
          title={broke && count < max ? t('Not enough money') : undefined}
          data-tutorial="part-add"
          aria-label={t('Add one {{name}}', { name: t(part.name) })}
          onClick={tryAdd}
        >
          +
        </button>
      </div>
    </section>
  );
}

/** Budget, mass, energy, and the supplies the mission asks for. */
/** Blocks in each supply bar. */
const METER_CELLS = 8;

export function Meters({ meters }) {
  return (
    <section className="meters" aria-label={t('Rocket supplies')}>
      <header className="meters__head">
        <h2 className="meters__title">{t('Supplies')}</h2>
        <span className="meters__stripes" aria-hidden="true" />
      </header>
      <div className="meters__grid">
        {meters.map((meter) => {
          const lit = meter.fill > 0 ? Math.max(1, Math.round((meter.fill / 100) * METER_CELLS)) : 0;
          // Every bar is the same cyan, so the color never says whether a supply is enough:
          // only money turns red when it is overspent (is-over).
          return (
            <div
              key={meter.id}
              className={`meter meter--${meter.id}${meter.bar && meter.tone === 'over' ? ' is-over' : ''}`}
            >
              {METER_ICONS[meter.id] && <img className="meter__icon" src={METER_ICONS[meter.id]} alt="" />}
              {!METER_ICONS[meter.id] && meter.icon && (
                <span className="meter__icon meter__icon--emoji" aria-hidden="true">{meter.icon}</span>
              )}
              <span className="meter__label" title={meter.tooltip ? t(meter.tooltip) : undefined}>{t(meter.label)}</span>
              <div
                className="meter__track"
                role="meter"
                aria-label={t(meter.label)}
                aria-valuemin={0}
                aria-valuemax={meter.max}
                aria-valuenow={meter.current}
                aria-valuetext={t('{{label}}: {{text}}', { label: t(meter.label), text: meter.phrase ? t(meter.phrase, meter.vars) : meter.text })}
              >
                {Array.from({ length: METER_CELLS }, (_, index) => (
                  <span key={index} className={index < lit ? 'meter__cell is-lit' : 'meter__cell'} />
                ))}
              </div>
              <span className="meter__value">{meter.phrase ? t(meter.phrase, meter.vars) : meter.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
