/**
 * Climb through the atmosphere, between the launch pad and space.
 * The camera follows the rocket: clouds rush past, the sky darkens to black,
 * stars fade in and Earth curves away below. Then the rocket shoots out the top.
 * CSS animations in ascent.css use the same length (--ascent-time: 6s).
 */
import { useEffect, useState } from 'react';
import { SPRITES } from '../levels';
import { PlanetHorizon } from './PlanetHorizon.jsx';
import { Rocket } from './Rocket.jsx';
import './ascent.css';

export const ASCENT_MS = 6000;
// Out of the atmosphere (the sky is already dark): the rear stage drops away, then only the
// short upper stage keeps going. Matches --separation-time in game.css.
const SEPARATION_AT_MS = 3800;
const SEPARATION_MS = 800;

// Clouds that slide down past the rocket: horizontal spot, width, delay and speed
const CLOUDS = [
  { x: '6%', w: '22vw', delay: '0s', time: '1.6s' },
  { x: '62%', w: '28vw', delay: '0.25s', time: '1.9s' },
  { x: '30%', w: '16vw', delay: '0.7s', time: '1.5s' },
  { x: '74%', w: '14vw', delay: '1.1s', time: '1.7s' },
  { x: '12%', w: '18vw', delay: '1.5s', time: '2s' },
];

export function AscentScene({ equipped, hud }) {
  // With reduced motion the separation is skipped and the short stage shows right away.
  const [stage, setStage] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'upper' : 'full',
  );
  useEffect(() => {
    if (stage !== 'full') return undefined;
    const drop = setTimeout(() => setStage('separating'), SEPARATION_AT_MS);
    const upper = setTimeout(() => setStage('upper'), SEPARATION_AT_MS + SEPARATION_MS);
    return () => {
      clearTimeout(drop);
      clearTimeout(upper);
    };
    // Timers start once; the stage changes they make must not restart them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ascent">
      <div className="ascent__sky" aria-hidden="true" />
      {SPRITES.background?.src && (
        <img className="ascent__stars" src={SPRITES.background.src} alt="" aria-hidden="true" />
      )}
      <PlanetHorizon className="ascent__planet" duration={ASCENT_MS} />
      {CLOUDS.map((cloud) => (
        <span
          key={cloud.x + cloud.delay}
          className="ascent__cloud"
          aria-hidden="true"
          style={{ '--x': cloud.x, '--w': cloud.w, '--delay': cloud.delay, '--time': cloud.time }}
        />
      ))}
      <div className="ascent__rocket">
        <Rocket equipped={equipped} ascending stage={stage} />
      </div>
      <div className="ascent__content">
        {hud}
        <p className="flight__status ascent__status">Leaving the atmosphere…</p>
      </div>
    </div>
  );
}
