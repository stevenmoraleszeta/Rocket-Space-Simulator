/**
 * Nayllel's launch animation as one piece: liftoff from the launch pad, then the climb
 * through the atmosphere (AscentScene). Calls onDone when the rocket reaches space.
 * Used by the orbit launch after the player picks the site and the route.
 * The sizes and timing come from game.css and ascent.css, the same as the hangar liftoff.
 */
import { useEffect, useState } from 'react';
import launchPad from '../assets/images/backgrounds/launch_pad.svg';
import launchBase from '../assets/images/rockets/launch_base.png';
import { ASCENT_MS, AscentScene } from './AscentScene.jsx';
import { PadClouds } from './PadClouds.jsx';
import { PadCrew } from './PadCrew.jsx';
import { LaunchTower } from './LaunchTower.jsx';
import { Rocket } from './Rocket.jsx';
import './game.css';

export const LIFTOFF_MS = 3600;

export function LaunchSequence({ equipped, hud = null, onDone }) {
  const [phase, setPhase] = useState('liftoff');

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const ms = reduceMotion ? 500 : phase === 'liftoff' ? LIFTOFF_MS : ASCENT_MS;
    const timer = setTimeout(() => (phase === 'liftoff' ? setPhase('ascent') : onDone()), ms);
    return () => clearTimeout(timer);
  }, [phase, onDone]);

  if (phase === 'ascent') {
    return <AscentScene equipped={equipped} hud={hud} />;
  }

  return (
    <div className="game game--pad">
      <div className="stage">
        <div className="stage__frame">
          <img className="stage__bg" src={launchPad} alt="" />
          <PadClouds />
          <div className="stage__mount">
            <div className="prep">
              <LaunchTower launching />
              <img className="prep__base" src={launchBase} alt="" />
              <Rocket equipped={equipped} launching />
              <PadCrew />
            </div>
          </div>
        </div>
      </div>
      {hud}
    </div>
  );
}
