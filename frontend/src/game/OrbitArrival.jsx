/**
 * Final scene of a successful orbital launch: the rocket circles the Earth
 * and a panel sums up the flight (time, orbit, speed, fuel and energy left, score).
 *
 * `summary` comes from the orbital launch level (see OrbitalLaunchLevel onOrbitReached).
 */
import { useEffect, useRef } from 'react';
import { SpaceBackground, StarRating, getMission } from '../levels';
import { displayName, useSettings } from '../settings';
import { SFX, playSfx } from '../audio';
import earth from '../assets/images/planets/earth.svg';
import { EARTH_RADIUS_METERS } from './physics/constants.js';
import { circularOrbitSpeed } from './physics/orbitalMechanics.js';
import { Rocket } from './Rocket.jsx';
import { rocketStatus } from './stats.js';
import './orbitArrival.css';

const formatNumber = (value) => Math.round(value).toLocaleString('en-US');

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
}

/** Turns the raw flight data into the rows shown on the panel. */
function buildStats(summary, equipped, mission) {
  const { outcome, orbit, site, vehicle, pct } = summary;
  const radius = outcome.orbitRadius;
  const speed = circularOrbitSpeed(radius);
  const lapSeconds = (2 * Math.PI * radius) / speed;
  const fuelLeft = Math.max(0, outcome.availableDeltaV - outcome.insertionDeltaV);
  const fuelPct = vehicle.totalDeltaV > 0 ? (fuelLeft / vehicle.totalDeltaV) * 100 : 0;
  const energy = rocketStatus(equipped, mission).meters.find((meter) => meter.id === 'energy');

  return [
    { label: 'Flight time', value: formatDuration(outcome.t) },
    { label: 'Orbit', value: orbit.name },
    { label: 'Altitude', value: `${formatNumber((radius - EARTH_RADIUS_METERS) / 1000)} km` },
    { label: 'Orbit speed', value: `${(speed / 1000).toFixed(1)} km/s` },
    { label: 'One lap', value: formatDuration(lapSeconds) },
    { label: 'Fuel left', value: `${Math.round(fuelPct)}%` },
    energy && { label: 'Energy left', value: energy.text },
    { label: 'Liftoff mass', value: `${formatNumber(vehicle.liftoffMassKg / 1000)} t` },
    { label: 'Off target', value: `${formatNumber(outcome.missKm)} km` },
    { label: 'Launch base', value: site.name },
    { label: 'Score', value: `${pct}%` },
  ].filter(Boolean);
}

export function OrbitArrival({ mission, equipped, summary, hud, onExit }) {
  const { playerName } = useSettings();
  const stats = buildStats(summary, equipped, mission);
  // +1 counterclockwise (eastward), −1 clockwise: the rocket circles the same way it flew
  const clockwise = summary.outcome.turning < 0;
  const unlocked = summary.unlockedMissionId ? getMission(summary.unlockedMissionId) : null;

  // Once, even when React runs effects twice in development
  const cheeredRef = useRef(false);
  useEffect(() => {
    if (cheeredRef.current) return;
    cheeredRef.current = true;
    playSfx(SFX.missionComplete);
  }, []);

  return (
    <SpaceBackground>
      <div className="game orbit-arrival">
        {hud}
        <div className="orbit-arrival__body">
          <div className="orbit-arrival__scene" aria-hidden="true">
            <div className="orbit-arrival__ring" />
            <img className="orbit-arrival__earth" src={earth} alt="" />
            <div className={clockwise ? 'orbit-arrival__path is-clockwise' : 'orbit-arrival__path'}>
              <div className="orbit-arrival__ship">
                <Rocket equipped={equipped} flying />
              </div>
            </div>
          </div>

          <section className="orbit-arrival__panel" aria-labelledby="orbit-arrival-title">
            <h2 id="orbit-arrival-title" className="orbit-arrival__title">In orbit!</h2>
            <p className="orbit-arrival__greet">
              Great flying, <b>{displayName(playerName)}</b>. Your rocket is circling the Earth.
            </p>
            <div className="orbit-arrival__stars">
              <StarRating stars={summary.stars} size={34} />
            </div>
            <dl className="orbit-arrival__stats">
              {stats.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            {unlocked && <p className="orbit-arrival__unlock">New mission unlocked: {unlocked.title}!</p>}
            <div className="orbit-arrival__actions">
              <button type="button" className="ms-btn" onClick={onExit}>Missions</button>
            </div>
          </section>
        </div>
      </div>
    </SpaceBackground>
  );
}
