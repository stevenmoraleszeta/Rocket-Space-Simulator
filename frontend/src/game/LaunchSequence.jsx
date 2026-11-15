/**
 * Nayllel's launch animation as one piece: liftoff from the launch pad, then the climb
 * through the atmosphere (AscentScene). Calls onDone when the rocket reaches space.
 * Used by the orbit launch after the player picks the site and the route.
 * The sizes and timing come from game.css and ascent.css, the same as the hangar liftoff.
 *
 * failure (see launchFailure.js): the rocket blows up instead of reaching space, on the pad
 * (no boosters) or in the atmosphere (no heat shield). Then onFail is called instead of onDone.
 */
import { useEffect, useState } from 'react';
import { SFX, playSfx } from '../audio';
import launchPad from '../assets/images/backgrounds/launch_pad.svg';
import sunGlow from '../assets/images/backgrounds/sun_glow.svg';
import launchBase from '../assets/images/rockets/launch_base.png';
import { ASCENT_MS, AscentScene, FALL_BACK_EXPLODE_AT_MS, OVERHEAT_EXPLODE_AT_MS } from './AscentScene.jsx';
import { PadClouds } from './PadClouds.jsx';
import { PadFlag } from './PadFlag.jsx';
import { PadCrew } from './PadCrew.jsx';
import { LaunchTower } from './LaunchTower.jsx';
import { Rocket } from './Rocket.jsx';
import './game.css';

export const LIFTOFF_MS = 3600;
/** No boosters: how long the rocket strains on the pad before it blows up. */
const STRAIN_MS = 1600;
/** Time to watch the explosion and read why before the failure screen. */
const EXPLOSION_MS = 2600;
/** Called off on the pad (no astronaut): the crew walks away and one says "no". */
const SCRUB_MS = 3800;
/**
 * Called back during the climb (not enough food, mission 2): the rocket lifts off, stops while
 * still low in the air, and comes back down onto the pad. Matches .rocket.is-turning-back.
 */
const TURN_BACK_MS = 7000;
/** Time to read why, with the rocket back on the pad, before the failure screen. */
const LANDED_BACK_MS = 3000;

export function LaunchSequence({ equipped, hud = null, onDone, failure = null, onFail }) {
  const padFailure = failure?.at === 'pad';
  const scrubbed = failure?.at === 'scrub';
  const turningBack = failure?.at === 'turnBack';
  // liftoff -> ascent -> space, or straining -> padExplosion, or liftoff -> ascent (overheating),
  // or scrubbed (called off on the ground: nothing lights, nothing blows up)
  const [phase, setPhase] = useState(scrubbed ? 'scrubbed' : turningBack ? 'turnBack' : padFailure ? 'straining' : 'liftoff');

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let ms;
    let next;
    if (phase === 'scrubbed') {
      ms = SCRUB_MS;
      next = onFail;
    } else if (phase === 'turnBack') {
      ms = reduceMotion ? 800 : TURN_BACK_MS;
      next = () => setPhase('landedBack');
    } else if (phase === 'landedBack') {
      ms = LANDED_BACK_MS;
      next = onFail;
    } else if (phase === 'straining') {
      ms = STRAIN_MS;
      next = () => {
        playSfx(SFX.explosion);
        setPhase('padExplosion');
      };
    } else if (phase === 'padExplosion') {
      ms = EXPLOSION_MS;
      next = onFail;
    } else if (phase === 'liftoff') {
      ms = reduceMotion ? 500 : LIFTOFF_MS;
      next = () => setPhase('ascent');
    } else if (failure) {
      // Overheating in the atmosphere: AscentScene shows the explosion.
      ms = (failure.at === 'climb' ? FALL_BACK_EXPLODE_AT_MS : OVERHEAT_EXPLODE_AT_MS) + EXPLOSION_MS;
      next = onFail;
    } else {
      ms = reduceMotion ? 500 : ASCENT_MS;
      next = onDone;
    }
    const timer = setTimeout(next, ms);
    return () => clearTimeout(timer);
  }, [phase, onDone, onFail, failure]);

  if (phase === 'ascent') {
    return (
      <AscentScene
        equipped={equipped}
        hud={hud}
        overheating={failure?.at === 'ascent'}
        fallingBack={failure?.at === 'climb'}
        failureMessage={failure?.message}
      />
    );
  }

  return (
    <div className="game game--pad">
      <div className="stage">
        <div className="stage__frame">
          <img className="stage__bg" src={launchPad} alt="" />
          <img className="stage__glow" src={sunGlow} alt="" />
          <PadClouds />
          {/* The flag on its pole, same place as in the hangar (PadFlag.jsx). */}
          <PadFlag />
          <div className="stage__mount">
            <div className="prep">
              <LaunchTower launching={phase !== 'scrubbed' && phase !== 'landedBack'} />
              <img className="prep__base" src={launchBase} alt="" />
              <Rocket
                equipped={equipped}
                launching={phase === 'liftoff'}
                straining={phase === 'straining'}
                exploding={phase === 'padExplosion'}
                turningBack={phase === 'turnBack'}
              />
              <PadCrew scrub={phase === 'scrubbed'} bubble={failure?.bubble} />
            </div>
          </div>
        </div>
      </div>
      {(phase === 'turnBack' || phase === 'landedBack') && failure && (
        <div className="launch-callback" role="alert">
          <p className="launch-callback__title">{phase === 'turnBack' ? 'Come back!' : 'Back on the ground'}</p>
          <p className="launch-callback__text">{failure.message}</p>
        </div>
      )}
      {phase === 'padExplosion' && failure && (
        <div className="launch-boom" role="alert">
          <p className="launch-boom__title">Boom!</p>
          <p className="launch-boom__text">{failure.message}</p>
        </div>
      )}
      {hud}
    </div>
  );
}
