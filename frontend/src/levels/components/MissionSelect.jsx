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
import { statSheet } from '../record.js';
import { Planet } from './Planet.jsx';
import { HistoryBoard, RankBadge, RecordButtons, StatsBoard } from './PlayerBoards.jsx';
import { StarRating } from './StarRating.jsx';
import { BlackHoleBackground } from './BlackHoleBackground.jsx';
import { SPRITES } from '../assets/sprites.js';
import { UPCOMING_MISSIONS } from '../data/upcomingMissions.js';
import { SettingsMenu } from '../../settings/SettingsMenu.jsx';
import { AppLogo } from '../../brand/AppLogo.jsx';
import { useSettings } from '../../settings/SettingsContext.jsx';
import { engineerName, sayTo } from '../../settings/settingsStore.js';
import adminIcon from '../../assets/images/icons/admin.svg';

export function MissionSelect({ onStartMission, googleSignedIn = false, authError = '' }) {
  const { missions, progress, getState, getStars, totalStars, maxStars, loading, adminMode, setAdminMode, playerUnlocked } = useProgress();
  const [open, setOpen] = useState(null);
  const [board, setBoard] = useState(null);
  const playerName = engineerName(useSettings().playerName);

  if (loading) {
    return (
      <BlackHoleBackground>
        <div className="brand-splash">
          <AppLogo size={96} wordmark bare />
          <p className="brand-splash__status">Loading…</p>
        </div>
      </BlackHoleBackground>
    );
  }

  return (
    <BlackHoleBackground>
    <div className="ms-select">
      <div className="ms-bar">
        <RankBadge stars={totalStars} />
        <nav className="ms-tools" aria-label="Menu">
          <button
            type="button"
            className={`ms-btn ms-btn--ghost ms-btn--icon ms-admin-toggle${adminMode ? ' ms-btn--admin' : ''}`}
            aria-pressed={adminMode}
            aria-label={adminMode
              ? 'Play as a normal player. Locked missions close again.'
              : 'Become admin. Opens every mission so a judge can try them.'}
            onClick={() => setAdminMode(!adminMode)}
          >
            <img className="ms-pixel" src={adminIcon} alt="" width={28} height={28} draggable="false" />
            {adminMode ? 'Play as player' : 'Become admin'}
          </button>
          <RecordButtons onHistory={() => setBoard('history')} onStats={() => setBoard('stats')} />
          <SettingsMenu googleSignedIn={googleSignedIn} authError={authError} />
        </nav>
      </div>

      <div className="ms-stage">
      <header className="ms-head">
        <AppLogo size={64} wordmark bare />
        <p className="ms-ages">A space game for kids ages 8 to 12</p>
        <h1>Choose your mission!</h1>
        <p className="ms-greet">
          {playerName
            ? <>Engineer <b>{playerName}</b>, the rockets are waiting for you.</>
            : 'You are the engineer. Add your name in settings.'}
        </p>
        {adminMode && (
          <p className="ms-admin-note" role="status">
            Admin is on. Every mission is open for review. Stars you earn stay saved.
          </p>
        )}
        <div className="ms-total" aria-label={`${totalStars} of ${maxStars} stars collected`}>
          <span aria-hidden="true">★</span> {totalStars} / {maxStars}
        </div>
      </header>

      <ol className="ms-path">
        {missions.map((m, i) => {
          const state = getState(m.id);
          const prev = missions[i - 1];
          const reviewOpen = adminMode && !playerUnlocked(m.id);
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
                    : `Mission ${m.number}, ${m.title}${state === 'completed' ? `, done, ${getStars(m.id)} out of 3 stars` : ''}${reviewOpen && state !== 'completed' ? '. Open for review.' : ''}`
                }
              >
                <Planet planet={m.planet} size={130} locked={state === 'locked'} />
                {state === 'locked' && SPRITES.lock?.src && (
                  <span className="ms-lock" aria-hidden="true">
                    <img className={`ms-lock__img${SPRITES.lock.pixelArt ? ' is-pixel' : ''}`} src={SPRITES.lock.src} alt="" draggable="false" />
                  </span>
                )}
                {state === 'completed' && <span className="ms-check" aria-hidden="true">✓</span>}
              </button>
              <div className="ms-stop__num">Mission {m.number}</div>
              <div className="ms-stop__title">{m.title}</div>
              <StarRating stars={getStars(m.id)} />
              {state === 'locked' && <div className="ms-stop__hint">Finish Mission {prev.number} to unlock</div>}
              {reviewOpen && state !== 'completed' && <div className="ms-stop__hint">Open for review</div>}
            </li>
          );
        })}
        {/* Missions 4 and 5: on the path, locked, "Coming soon". */}
        {UPCOMING_MISSIONS.map((m) => (
          <li key={m.id} className="ms-stop ms-stop--locked ms-stop--soon">
            <button className="ms-stop__btn" disabled aria-label={`Mission ${m.number}, ${m.title}. Coming soon.`}>
              <Planet planet={m.planet} size={130} locked />
              {SPRITES.lock?.src && (
                <span className="ms-lock" aria-hidden="true">
                  <img className={`ms-lock__img${SPRITES.lock.pixelArt ? ' is-pixel' : ''}`} src={SPRITES.lock.src} alt="" draggable="false" />
                </span>
              )}
            </button>
            <div className="ms-stop__num">Mission {m.number}</div>
            <div className="ms-stop__title">{m.title}</div>
            <div className="ms-stop__hint ms-stop__soon">Coming soon</div>
          </li>
        ))}
      </ol>
      </div>

      {board === 'history' && (
        <HistoryBoard progress={progress} missions={missions} onClose={() => setBoard(null)} />
      )}
      {board === 'stats' && (
        <StatsBoard sheet={statSheet(progress, missions)} onClose={() => setBoard(null)} />
      )}

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
    </BlackHoleBackground>
  );
}

/** Dialog with the mission's goal and a fun fact. */
export function MissionCard({ mission, stars, completed, onClose, onLaunch }) {
  const launchRef = useRef(null);
  const playerName = engineerName(useSettings().playerName);

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
        {playerName && <p className="ms-card__hello">{sayTo(playerName, 'This job is yours.')}</p>}
        {mission.intro && <p className="ms-card__intro">{mission.intro}</p>}
        <p className="ms-card__goal">{mission.goal}</p>
        <div className="ms-card__fact">
          <b>Did you know?</b> {mission.funFact}
        </div>
        {completed && (
          <div className="ms-card__best">{playerName ? `${playerName}, your best:` : 'Your best:'} <StarRating stars={stars} size={20} /></div>
        )}
        <div className="ms-card__actions">
          <button className="ms-btn ms-btn--ghost" onClick={onClose}>Back</button>
          <button className="ms-btn" ref={launchRef} onClick={onLaunch}>{completed ? 'Play again' : 'Launch!'}</button>
        </div>
      </div>
    </div>
  );
}
