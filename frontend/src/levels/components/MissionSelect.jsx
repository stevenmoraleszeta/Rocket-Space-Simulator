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
import { SpaceBackground } from './SpaceBackground.jsx';
import { SPRITES } from '../assets/sprites.js';
import { SettingsMenu } from '../../settings/SettingsMenu.jsx';
import { AppLogo } from '../../brand/AppLogo.jsx';
import { useSettings } from '../../settings/SettingsContext.jsx';
import { t } from '../../i18n/index.js';
import { engineerName, sayTo } from '../../settings/settingsStore.js';
import adminIcon from '../../assets/images/icons/admin.svg';

export function MissionSelect({ onStartMission, googleSignedIn = false, authError = '' }) {
  const { missions, progress, getState, getStars, totalStars, maxStars, loading, adminMode, setAdminMode, playerUnlocked } = useProgress();
  const [open, setOpen] = useState(null);
  const [board, setBoard] = useState(null);
  const playerName = engineerName(useSettings().playerName);

  if (loading) {
    return (
      <SpaceBackground>
        <div className="brand-splash">
          <AppLogo size={96} wordmark bare />
          <p className="brand-splash__status">{t('Loading…')}</p>
        </div>
      </SpaceBackground>
    );
  }

  return (
    <SpaceBackground>
    <div className="ms-select">
      <div className="ms-bar">
        <RankBadge stars={totalStars} />
        <nav className="ms-tools" aria-label={t('Menu')}>
          <button
            type="button"
            className={`ms-btn ms-btn--ghost ms-btn--icon ms-admin-toggle${adminMode ? ' ms-btn--admin' : ''}`}
            aria-pressed={adminMode}
            aria-label={adminMode
              ? t('Play as a normal player. Locked missions close again.')
              : t('Become admin. Opens every mission so a judge can try them.')}
            onClick={() => setAdminMode(!adminMode)}
          >
            <img className="ms-pixel" src={adminIcon} alt="" width={28} height={28} draggable="false" />
            {adminMode ? t('Play as player') : t('Become admin')}
          </button>
          <RecordButtons onHistory={() => setBoard('history')} onStats={() => setBoard('stats')} />
          <SettingsMenu googleSignedIn={googleSignedIn} authError={authError} />
        </nav>
      </div>

      <div className="ms-stage">
      <header className="ms-head">
        <AppLogo size={64} wordmark bare />
        <p className="ms-ages">{t('A space game for kids ages 8 to 12')}</p>
        <h1>{t('Choose your mission!')}</h1>
        <p className="ms-greet">
          {playerName
            ? <>{t('Engineer')} <b>{playerName}</b>{t(', the rockets are waiting for you.')}</>
            : t('You are the engineer. Add your name in settings.')}
        </p>
        {adminMode && (
          <p className="ms-admin-note" role="status">
            {t('Admin is on. Every mission is open for review. Stars you earn stay saved.')}
          </p>
        )}
        <div className="ms-total" aria-label={t('{{stars}} of {{max}} stars collected', { stars: totalStars, max: maxStars })}>
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
              {state === 'current' && <div className="ms-bubble" aria-hidden="true">{t('Play!')}</div>}
              <button
                className="ms-stop__btn"
                disabled={state === 'locked'}
                onClick={() => setOpen(m)}
                aria-label={
                  state === 'locked'
                    ? t('Mission {{number}}, {{title}}. Locked. Finish mission {{prev}} to unlock it.', {
                      number: m.number,
                      title: t(m.title),
                      prev: prev.number,
                    })
                    : t('Mission {{number}}, {{title}}{{done}}{{review}}', {
                      number: m.number,
                      title: t(m.title),
                      done: state === 'completed' ? t(', done, {{stars}} out of 3 stars', { stars: getStars(m.id) }) : '',
                      review: reviewOpen && state !== 'completed' ? t('. Open for review.') : '',
                    })
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
              <div className="ms-stop__num">{t('Mission {{number}}', { number: m.number })}</div>
              <div className="ms-stop__title">{t(m.title)}</div>
              <StarRating stars={getStars(m.id)} />
              {state === 'locked' && <div className="ms-stop__hint">{t('Finish Mission {{number}} to unlock', { number: prev.number })}</div>}
              {reviewOpen && state !== 'completed' && <div className="ms-stop__hint">{t('Open for review')}</div>}
            </li>
          );
        })}
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
    </SpaceBackground>
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
        <div className="ms-card__num">{t('Mission {{number}}', { number: mission.number })} · {t(mission.place)}</div>
        <h2 id="ms-card-title">{t(mission.title)}</h2>
        {playerName && <p className="ms-card__hello">{sayTo(playerName, t('This job is yours.'))}</p>}
        {mission.intro && <p className="ms-card__intro">{t(mission.intro)}</p>}
        <p className="ms-card__goal">{t(mission.goal)}</p>
        <div className="ms-card__fact">
          <b>{t('Did you know?')}</b> {t(mission.funFact)}
        </div>
        {completed && (
          <div className="ms-card__best">{playerName ? t('{{name}}, your best:', { name: playerName }) : t('Your best:')} <StarRating stars={stars} size={20} /></div>
        )}
        <div className="ms-card__actions">
          <button className="ms-btn ms-btn--ghost" onClick={onClose}>{t('Back')}</button>
          <button className="ms-btn" ref={launchRef} onClick={onLaunch}>{completed ? t('Play again') : t('Launch!')}</button>
        </div>
      </div>
    </div>
  );
}
