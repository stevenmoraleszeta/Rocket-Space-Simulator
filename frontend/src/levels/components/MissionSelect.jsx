/**
 * Mission selection screen: the 3 missions in order (Earth → Moon → Mars).
 * Tapping an unlocked mission opens its card; "Launch!" calls onStartMission(mission).
 *
 *   <MissionSelect onStartMission={(mission) => startGameplay(mission)} />
 *
 * Styles live in missions.css (ms-* classes). Art comes from assets/sprites.js.
 */
import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../ProgressContext.jsx';
import { Planet } from './Planet.jsx';
import { StarRating } from './StarRating.jsx';
import { SpaceBackground } from './SpaceBackground.jsx';
import { SPRITES } from '../assets/sprites.js';
import { useSettings } from '../../settings/SettingsContext.jsx';

export function MissionSelect({ onStartMission }) {
  const { missions, getState, getStars, totalStars, maxStars, loading } = useProgress();
  const [open, setOpen] = useState(null);
  const playerName = useSettings().playerName.trim();

  if (loading) return <SpaceBackground><div className="ms-loading">Loading…</div></SpaceBackground>;

  return (
    <SpaceBackground>
    <div className="ms-select">
      <header className="ms-head">
        <h1>Choose your mission!</h1>
        {playerName && <p className="ms-greet">Ready for launch, <b>{playerName}</b>?</p>}
        <div className="ms-total" aria-label={`${totalStars} of ${maxStars} stars collected`}>
          <span aria-hidden="true">★</span> {totalStars} / {maxStars}
        </div>
      </header>

      <ol className="ms-path">
        {missions.map((m, i) => {
          const state = getState(m.id);
          const prev = missions[i - 1];
          return (
            <li key={m.id} className={`ms-stop ms-stop--${state}`}>
              {state === 'current' && <div className="ms-bubble" aria-hidden="true">Play!</div>}
              <button
                className="ms-stop__btn"
                disabled={state === 'locked'}
                onClick={() => setOpen(m)}
                aria-label={
                  state === 'locked'
                    ? `Mission ${m.number}, ${m.title}. Locked. Finish mission ${prev.number} to unlock it.`
                    : `Mission ${m.number}, ${m.title}${state === 'completed' ? `, done, ${getStars(m.id)} out of 3 stars` : ''}`
                }
              >
                <Planet planet={m.planet} size={130} locked={state === 'locked'} />
                {state === 'locked' && (
                  <span className="ms-lock" aria-hidden="true">
                    {SPRITES.lock?.src
                      ? <img className={`ms-lock__img${SPRITES.lock.pixelArt ? ' is-pixel' : ''}`} src={SPRITES.lock.src} alt="" draggable="false" />
                      : '🔒'}
                  </span>
                )}
                {state === 'completed' && <span className="ms-check" aria-hidden="true">✓</span>}
              </button>
              <div className="ms-stop__num">Mission {m.number}</div>
              <div className="ms-stop__title">{m.title}</div>
              <StarRating stars={getStars(m.id)} />
              {state === 'locked' && <div className="ms-stop__hint">Finish Mission {prev.number} to unlock</div>}
            </li>
          );
        })}
      </ol>

      {open && (
        <MissionCard
          mission={open}
          stars={getStars(open.id)}
          completed={getState(open.id) === 'completed'}
          onClose={() => setOpen(null)}
          onLaunch={() => { setOpen(null); onStartMission?.(open); }}
        />
      )}
    </div>
    </SpaceBackground>
  );
}

/** Dialog with the mission's goal and a fun fact. */
export function MissionCard({ mission, stars, completed, onClose, onLaunch }) {
  const launchRef = useRef(null);

  useEffect(() => {
    launchRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ms-modal" role="dialog" aria-modal="true" aria-labelledby="ms-card-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ms-card">
        <Planet planet={mission.planet} size={110} />
        <div className="ms-card__num">Mission {mission.number} · {mission.place}</div>
        <h2 id="ms-card-title">{mission.title}</h2>
        <p className="ms-card__goal">{mission.goal}</p>
        <div className="ms-card__fact">
          <b>Did you know?</b> {mission.funFact}
        </div>
        {completed && (
          <div className="ms-card__best">Your best: <StarRating stars={stars} size={20} /></div>
        )}
        <div className="ms-card__actions">
          <button className="ms-btn ms-btn--ghost" onClick={onClose}>Back</button>
          <button className="ms-btn" ref={launchRef} onClick={onLaunch}>{completed ? 'Play again 🚀' : 'Launch! 🚀'}</button>
        </div>
      </div>
    </div>
  );
}
