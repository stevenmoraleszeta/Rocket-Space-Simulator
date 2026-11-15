/**
 * Main-menu record: the star title, the mission history, and the stats board.
 */
import { useEffect, useRef } from 'react';
import historyIcon from '../../assets/images/icons/history.svg';
import statsIcon from '../../assets/images/icons/stats.svg';
import cadetBadge from '../../assets/images/ranks/cadet.svg';
import pilotBadge from '../../assets/images/ranks/pilot.svg';
import commanderBadge from '../../assets/images/ranks/commander.svg';
import { PARTS } from '../../game/parts.js';
import { RANKS, flightCards, nextRankLine, rankFor, unloggedAttempts } from '../record.js';
import { Planet } from './Planet.jsx';
import { StarRating } from './StarRating.jsx';

const BADGES = {
  cadet: cadetBadge,
  pilot: pilotBadge,
  commander: commanderBadge,
};

function PixelIcon({ src, size = 28 }) {
  return <img className="ms-pixel" src={src} alt="" width={size} height={size} draggable="false" />;
}

export function RankBadge({ stars }) {
  const rank = rankFor(stars);
  const shown = rank.current || rank.next || RANKS[0];
  return (
    <div className={`ms-rank${rank.current ? ' is-earned' : ''}`}>
      <PixelIcon src={BADGES[shown.id]} size={72} />
      <div>
        <p className="ms-rank__kicker">{rank.current ? 'Your title' : 'Next title'}</p>
        <p className="ms-rank__name">{shown.name}</p>
        <p className="ms-rank__cheer">{rank.current ? rank.current.cheer : nextRankLine(stars)}</p>
        {rank.current && rank.next && <p className="ms-rank__next">{nextRankLine(stars)}</p>}
      </div>
    </div>
  );
}

export function RecordButtons({ onHistory, onStats }) {
  return (
    <>
      <button type="button" className="ms-btn ms-btn--ghost ms-btn--icon" aria-label="Mission history" onClick={onHistory}>
        <PixelIcon src={historyIcon} />
        History
      </button>
      <button type="button" className="ms-btn ms-btn--ghost ms-btn--icon" aria-label="Statistics" onClick={onStats}>
        <PixelIcon src={statsIcon} />
        Stats
      </button>
    </>
  );
}

function Board({ title, label, onClose, children }) {
  const closeRef = useRef(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ms-modal" role="dialog" aria-modal="true" aria-labelledby="ms-board-title" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="ms-card ms-card--wide">
        <h2 id="ms-board-title">{title}</h2>
        <p className="ms-board__lead">{label}</p>
        {children}
        <div className="ms-card__actions">
          <button type="button" className="ms-btn" ref={closeRef} onClick={onClose}>Back</button>
        </div>
      </div>
    </div>
  );
}

const PICK_LABELS = {
  site: 'Launch base',
  orbit: 'Orbit',
  window: 'Trip',
  craft: 'Too close to',
  place: 'Place',
};

function flightWhen(at) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function PackChip({ id, count }) {
  const part = PARTS.find((item) => item.id === id);
  if (!part) return null;
  const x = part.offX ?? part.frameX ?? 0;
  const y = part.offY ?? part.frameY ?? 0;
  return (
    <li className="ms-pack">
      {part.src ? (
        <img className="ms-pixel" src={part.src} alt="" width={32} height={32} draggable="false" />
      ) : (
        <span
          className="ms-pack__sheet"
          style={{
            backgroundImage: `url(${part.sheet})`,
            backgroundPosition: `-${x}px -${y}px`,
            backgroundSize: `${part.sheetWidth}px ${part.sheetHeight}px`,
          }}
        />
      )}
      <span>{count > 1 ? `${part.name} ×${count}` : part.name}</span>
    </li>
  );
}

export function HistoryBoard({ progress, missions, onClose }) {
  const cards = flightCards(progress, missions);
  const older = unloggedAttempts(progress, missions);
  const empty = cards.length === 0 && older === 0;
  return (
    <Board
      title="Mission history"
      label={empty ? 'No flights yet. Your trips will show up here.' : 'Every trip stays here, even when you fly it again.'}
      onClose={onClose}
    >
      {older > 0 && (
        <p className="ms-log__older">
          {older === 1 ? '1 earlier trip was saved' : `${older} earlier trips were saved`} before this log. New trips show what you packed.
        </p>
      )}
      <ol className="ms-log">
        {cards.map((card) => {
          const packed = Object.entries(card.packed || {});
          const picks = Object.entries(card.picks || {}).filter(([key]) => PICK_LABELS[key]);
          return (
            <li key={card.id} className={`ms-trip${card.success ? ' is-made' : ''}`}>
              <div className="ms-trip__head">
                <Planet planet={card.mission.planet} size={56} />
                <div>
                  <p className="ms-log__num">Mission {card.mission.number} · {card.mission.place}</p>
                  <h3 className="ms-log__title">{card.mission.title}</h3>
                  <p className="ms-trip__when">{flightWhen(card.at)}</p>
                </div>
                <div className="ms-trip__score">
                  <StarRating stars={card.stars} size={16} />
                  <p>{card.success ? `Score ${card.pct}` : 'Stopped'}</p>
                </div>
              </div>
              {picks.length > 0 && (
                <ul className="ms-picks">
                  {picks.map(([key, value]) => (
                    <li key={key} className="ms-pick">
                      <b>{PICK_LABELS[key]}</b>
                      {value}
                    </li>
                  ))}
                </ul>
              )}
              {packed.length > 0 ? (
                <ul className="ms-pack-row">
                  {packed.map(([id, count]) => <PackChip key={id} id={id} count={count} />)}
                </ul>
              ) : (
                <p className="ms-log__line">No extra parts.</p>
              )}
            </li>
          );
        })}
      </ol>
    </Board>
  );
}

function StatTile({ value, label }) {
  return (
    <div className="ms-stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function StatsBoard({ sheet, onClose }) {
  const { stars, maxStars, completed, missionCount, attempts, bestPct, hasScore, rank } = sheet;
  return (
    <Board title="Your stats" label={rank.current ? rank.current.cheer : 'Your stars pick your title.'} onClose={onClose}>
      <div className="ms-stats">
        <StatTile value={`${stars} / ${maxStars}`} label="Stars" />
        <StatTile value={`${completed} / ${missionCount}`} label="Missions done" />
        <StatTile value={attempts === 0 ? 'None yet' : String(attempts)} label="Flights" />
        <StatTile value={hasScore ? String(bestPct) : 'None yet'} label="Best score" />
      </div>
      <ol className="ms-ladder">
        {RANKS.map((rankItem) => {
          const yours = rank.current?.id === rankItem.id;
          const earned = stars >= rankItem.minStars;
          const state = yours ? 'yours' : earned ? 'earned' : 'ahead';
          return (
            <li key={rankItem.id} className={`ms-ladder__row is-${state}`}>
              <PixelIcon src={BADGES[rankItem.id]} size={48} />
              <div>
                <p className="ms-ladder__name">{rankItem.name}</p>
                <p className="ms-ladder__need">{rankItem.minStars === 1 ? '1 star' : `${rankItem.minStars} stars`}</p>
              </div>
              <span className="ms-ladder__tag">{yours ? 'Yours!' : earned ? 'Earned' : 'Later'}</span>
            </li>
          );
        })}
      </ol>
      <p className="ms-board__next">{nextRankLine(stars)}</p>
    </Board>
  );
}
