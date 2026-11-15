import { useMemo, useState } from 'react'
import { LAUNCH_SITES } from '../orbit/launchSites.js'
import { ASSETS } from '../../rendering/assetManifest.js'
import moonSprite from '../../../levels/assets/moon.svg'
import {
  formatLaunchDate,
  getLaunchSitePosition,
  getMoonPosition,
  getMoonTransferPlan,
  localDateTimeValue,
  MOON_MEAN_DISTANCE_KM,
  MOON_MIN_CLEARANCE_KM,
  MOON_ORBIT_ECCENTRICITY,
  MOON_SYNODIC_MONTH_DAYS,
  MOON_WINDOW_TOLERANCE_DEGREES,
  parseLaunchDate,
} from './moonLaunchPlanning.js'

const MAP = { width: 900, height: 560, centerX: 450, centerY: 280, earthRadius: 42, orbitRadius: 226 }
const DISPLAY_EARTH_RADIUS_KM = 6371

function pointOnMap(angle, radius, earthRadius = MAP.earthRadius) {
  return {
    x: MAP.centerX + radius * Math.cos(angle),
    y: MAP.centerY - radius * Math.sin(angle),
  }
}

function mapSitePosition(site, date, earthRadius = MAP.earthRadius) {
  const state = getLaunchSitePosition(site, date)
  return {
    x: MAP.centerX + earthRadius * state.x,
    y: MAP.centerY - earthRadius * state.y,
  }
}

function transferPath(plan) {
  return plan.trajectory.map((point, index) => {
    const distance = Math.hypot(point.x, point.y)
    const displayRadius = MAP.earthRadius
      + ((distance - DISPLAY_EARTH_RADIUS_KM) / (384400 - DISPLAY_EARTH_RADIUS_KM)) * (MAP.orbitRadius - MAP.earthRadius)
    const angle = Math.atan2(point.y, point.x)
    const screen = pointOnMap(angle, displayRadius)
    return `${index === 0 ? 'M' : 'L'}${screen.x.toFixed(1)} ${screen.y.toFixed(1)}`
  }).join(' ')
}

function displayMoonRadius(distanceKm) {
  return MAP.earthRadius
    + ((distanceKm - DISPLAY_EARTH_RADIUS_KM) / (MOON_MEAN_DISTANCE_KM - DISPLAY_EARTH_RADIUS_KM))
      * (MAP.orbitRadius - MAP.earthRadius)
}

function moonOrbitPath(moon) {
  const semiMajorAxisKm = MOON_MEAN_DISTANCE_KM
  const eccentricity = MOON_ORBIT_ECCENTRICITY
  return Array.from({ length: 97 }, (_, index) => {
    const trueAnomaly = (Math.PI * 2 * index) / 96
    const distanceKm = semiMajorAxisKm * (1 - eccentricity ** 2)
      / (1 + eccentricity * Math.cos(trueAnomaly))
    const angle = moon.perigeeLongitude + trueAnomaly
    const screen = pointOnMap(angle, displayMoonRadius(distanceKm))
    return `${index === 0 ? 'M' : 'L'}${screen.x.toFixed(1)} ${screen.y.toFixed(1)}`
  }).join(' ')
}

function trafficPosition(traffic) {
  const displayRadius = MAP.earthRadius + 10 + Math.sqrt(traffic.altitudeKm / 35786) * 28
  return pointOnMap(traffic.initialAngle, displayRadius)
}

export function MoonLaunchSetup({
  onBack,
  onExit,
  onLaunch,
  largeText,
  muted,
  onToggleLargeText,
  onToggleSound,
}) {
  const [step, setStep] = useState('site')
  const [siteId, setSiteId] = useState(null)
  const [dateValue, setDateValue] = useState(() => localDateTimeValue())
  const [cycleDay, setCycleDay] = useState(0)
  const anchorDate = parseLaunchDate(dateValue)
  const date = anchorDate ? new Date(anchorDate.getTime() + cycleDay * 86400000) : null
  const site = LAUNCH_SITES.find((candidate) => candidate.id === siteId) ?? null
  const plan = useMemo(() => site && date ? getMoonTransferPlan(site, date) : null, [cycleDay, dateValue, site])
  const moonNow = date ? getMoonPosition(date) : null
  const moonArrival = plan?.moonAtArrival ?? moonNow
  const isSiteZoomed = step === 'site' && Boolean(site)
  const earthRadius = isSiteZoomed ? 108 : MAP.earthRadius
  const moonPoint = moonArrival
    ? pointOnMap(moonArrival.longitude, displayMoonRadius(moonArrival.distanceKm))
    : pointOnMap(0, MAP.orbitRadius)
  const launchPoint = site && date ? mapSitePosition(site, date, earthRadius) : null
  const visibleSites = step === 'site' ? LAUNCH_SITES : LAUNCH_SITES.filter((candidate) => candidate.id === siteId)

  function chooseSite(id) {
    setSiteId(id)
    setStep('site')
  }

  function goToTrajectory() {
    if (!site || !date) return
    setStep('trajectory')
  }

  function chooseAnchorDate(value) {
    setDateValue(value)
    setCycleDay(0)
  }

  function startLaunch() {
    if (!site || !date || !plan?.safeWindow) return
    onLaunch({
      siteId: site.id,
      launchDate: date.toISOString(),
      transferDays: plan.transferDays,
      arrivalMissDegrees: plan.missDegrees,
      phaseAtLaunch: plan.phaseAtLaunch,
    })
  }

  return (
    <main className="moon-launch-setup">
      <header className="moon-launch-setup__header">
        <button type="button" className="game__back" onClick={onExit}>Missions</button>
        <button type="button" className="game__back" onClick={onBack}>Hangar</button>
        <div>
          <p>MISSION 2 · EARTH TO MOON</p>
          <h1>{step === 'site' ? 'Choose a launch base' : 'Check the Moon path'}</h1>
        </div>
        <span>MEDIUM</span>
        <nav className="moon-launch-setup__tools" aria-label="Accessibility and sound">
          <button type="button" aria-pressed={largeText} onClick={onToggleLargeText}>A+ Text</button>
          <button type="button" aria-pressed={muted} onClick={onToggleSound}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
        </nav>
      </header>

      <div className="moon-launch-setup__layout">
        <section className="moon-launch-map" aria-label="Earth, launch base, Moon, and transfer path">
          <svg
            className={isSiteZoomed ? 'is-site-zoomed' : ''}
            viewBox={isSiteZoomed ? '200 124 500 312' : `0 0 ${MAP.width} ${MAP.height}`}
            role="img"
            aria-label="The Moon moves around Earth. The dotted line shows a calculated transfer path."
          >
            <defs>
              <radialGradient id="moon-map-space"><stop stopColor="#132c58" /><stop offset="1" stopColor="#050b1b" /></radialGradient>
              <clipPath id="moon-map-earth-clip"><circle cx={MAP.centerX} cy={MAP.centerY} r={earthRadius} /></clipPath>
              <clipPath id="moon-map-moon-clip"><circle cx={moonPoint.x} cy={moonPoint.y} r="19" /></clipPath>
            </defs>
            <rect width={MAP.width} height={MAP.height} fill="url(#moon-map-space)" />
            {Array.from({ length: 54 }, (_, index) => (
              <circle key={index} cx={(index * 97 + 23) % MAP.width} cy={(index * 149 + 41) % MAP.height} r={index % 5 === 0 ? 2 : 1} fill="#b9d8ec" opacity=".75" />
            ))}
            {step === 'trajectory' && (
              <>
                <path d={moonOrbitPath(plan.moonAtArrival)} fill="none" stroke="#7186bd" strokeDasharray="2 8" strokeWidth="2" opacity=".8" />
                {plan?.traffic.map((object) => {
                  const position = trafficPosition(object)
                  return (
                    <g key={object.id} className={`moon-map-traffic is-${object.kind}`}>
                      <circle cx={position.x} cy={position.y} r={object.kind === 'debris' ? 3 : 5} />
                      <title>{object.name}; modeled orbit at {object.altitudeKm.toLocaleString()} km, not live tracking</title>
                    </g>
                  )
                })}
              </>
            )}
            {step === 'trajectory' && plan && (
              <path d={transferPath(plan)} className="moon-transfer-path" fill="none" stroke={plan.safeWindow ? '#3ddc97' : '#ffd23f'} strokeDasharray="5 7" strokeWidth="4" />
            )}
            {step === 'trajectory' && plan && (
              <line
                x1={MAP.centerX + displayMoonRadius(plan.moonAtArrival.distanceKm) * Math.cos(plan.expectedArrivalAngle)}
                y1={MAP.centerY - displayMoonRadius(plan.moonAtArrival.distanceKm) * Math.sin(plan.expectedArrivalAngle)}
                x2={moonPoint.x}
                y2={moonPoint.y}
                stroke="#ff8fa6"
                strokeDasharray="3 6"
                strokeWidth="2"
              />
            )}
            <image
              href={ASSETS.earthPlanet.src}
              x={MAP.centerX - earthRadius}
              y={MAP.centerY - earthRadius}
              width={earthRadius * 2}
              height={earthRadius * 2}
              clipPath="url(#moon-map-earth-clip)"
              preserveAspectRatio="xMidYMid slice"
            />
            {!isSiteZoomed && (
              <image
                href={moonSprite}
                x={moonPoint.x - 19}
                y={moonPoint.y - 19}
                width="38"
                height="38"
                preserveAspectRatio="xMidYMid meet"
                aria-label="Moon at arrival"
              />
            )}
            {step === 'trajectory' && plan && plan.phaseAtArrival.illumination < 0.96 && (
              <g clipPath="url(#moon-map-moon-clip)">
                <circle
                  cx={moonPoint.x + (plan.phaseAtArrival.phaseIndex <= 3 ? -1 : 1) * 2 * plan.phaseAtArrival.illumination * 19}
                  cy={moonPoint.y}
                  r="19"
                  fill="#080f26"
                  opacity=".82"
                />
              </g>
            )}
            {!isSiteZoomed && (
              <>
                <text x={MAP.centerX} y={MAP.centerY + 68} textAnchor="middle">EARTH</text>
                <text x={moonPoint.x} y={moonPoint.y + 32} textAnchor="middle">MOON AT ARRIVAL</text>
              </>
            )}
            {visibleSites.map((candidate, index) => {
              const position = date ? mapSitePosition(candidate, date, earthRadius) : { x: MAP.centerX, y: MAP.centerY }
              const selected = candidate.id === siteId
              return step === 'site' ? (
                <g
                  key={candidate.id}
                  className={`moon-map-site${selected ? ' is-selected' : ''}`}
                  role="button"
                  tabIndex="0"
                  aria-label={`Select ${candidate.name}, ${candidate.country}`}
                  aria-pressed={selected}
                  onClick={() => chooseSite(candidate.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') chooseSite(candidate.id)
                  }}
                >
                  <circle cx={position.x} cy={position.y} r="12" fill="transparent" />
                  <circle cx={position.x} cy={position.y} r={selected ? 7 : 4} />
                  {isSiteZoomed && (
                    <text x={position.x} y={position.y + 3} textAnchor="middle">{index + 1}</text>
                  )}
                </g>
              ) : (
                <circle key={candidate.id} cx={position.x} cy={position.y} r="7" fill="#ffd23f" stroke="#05061a" strokeWidth="3" />
              )
            })}
            {launchPoint && step === 'trajectory' && (
              <g transform={`translate(${launchPoint.x} ${launchPoint.y})`}>
                <circle r="13" fill="none" stroke="#ffd23f" strokeWidth="2" />
                <text x="0" y="-19" textAnchor="middle">LAUNCH BASE</text>
              </g>
            )}
          </svg>
          <div className="moon-launch-map__legend">
            {isSiteZoomed ? (
              <span>🌍 Earth · Numbered locations match the list</span>
            ) : (
              <>
                <span>🌍 Earth</span><span>🌙 Moon</span><span>··· Transfer path</span><span>Scale shortened to fit</span>
              </>
            )}
          </div>
        </section>

        <aside className="moon-launch-panel" aria-live="polite">
          {step === 'site' ? (
            <>
              <h2>1. Pick a launch base</h2>
              <p>{site ? 'Map zoomed in: check every launch base, then continue.' : 'Select a base on Earth to zoom in and compare all locations.'}</p>
              <div className="moon-launch-base-list" role="group" aria-label="Choose a launch base">
                {LAUNCH_SITES.map((candidate, index) => (
                  <button
                    type="button"
                    key={candidate.id}
                    className={candidate.id === siteId ? 'is-selected' : ''}
                    aria-pressed={candidate.id === siteId}
                    onClick={() => chooseSite(candidate.id)}
                  >
                    <span className="moon-launch-base-list__number">{index + 1}</span>
                    <b>{candidate.name}</b>
                    <span>{candidate.country}</span>
                  </button>
                ))}
              </div>
              {site ? (
                <div className="moon-launch-detail">
                  <b>{site.name}, {site.country}</b>
                  <span>{site.spaceport}</span>
                  <span>Earth’s spin will set its launch position.</span>
                </div>
              ) : <p className="moon-launch-detail">Choose one of the eight bases on Earth or in the list.</p>}
              <div className="moon-launch-actions">
                <button type="button" className="game__back" onClick={onBack}>Hangar</button>
                <button type="button" className="ms-btn" disabled={!site || !date} onClick={goToTrajectory}>Zoom out · Moon</button>
              </div>
            </>
          ) : (
            <>
              <h2>2. Choose a safe Moon window</h2>
              <p>Move the date through one Moon cycle. The dotted path and Moon move with it.</p>
              <label>
                Cycle start date
                <input type="datetime-local" value={dateValue} onChange={(event) => chooseAnchorDate(event.target.value)} />
              </label>
              <label className="moon-cycle-slider">
                <span>Moon cycle · day {cycleDay.toFixed(2)} of {MOON_SYNODIC_MONTH_DAYS.toFixed(1)}</span>
                <input
                  type="range"
                  min="0"
                  max={MOON_SYNODIC_MONTH_DAYS}
                  step="0.25"
                  value={cycleDay}
                  aria-label="Launch date through the Moon's cycle"
                  onChange={(event) => setCycleDay(Number(event.target.value))}
                />
                <span className="moon-cycle-slider__ticks">
                  <span>🌑 New</span><span>🌓 Quarter</span><span>🌕 Full</span><span>🌗 Quarter</span><span>🌑</span>
                </span>
              </label>
              <div className="moon-launch-detail">
                <b>{site.name}, {site.country}</b>
                <span>Launch: {formatLaunchDate(date)}</span>
                <span>{plan.phaseAtLaunch.symbol} {plan.phaseAtLaunch.name} · {(plan.phaseAtLaunch.illumination * 100).toFixed(0)}% lit</span>
                <span>Trip: about {plan.transferDays.toFixed(1)} days</span>
                <span>{plan.phaseAtArrival.symbol} Arrival Moon: {plan.phaseAtArrival.name}</span>
                <span className={plan.safeWindow ? 'is-good' : 'is-warn'}>
                  Moon timing: {plan.missDegrees.toFixed(1)}° from the transfer path
                </span>
                <span className={plan.closestApproachKm >= MOON_MIN_CLEARANCE_KM ? 'is-good' : 'is-warn'}>
                  Traffic clearance: {Math.round(plan.closestApproachKm).toLocaleString()} km
                </span>
                <span className={plan.safeWindow ? 'is-good' : 'is-warn'}>
                  {plan.safeWindow
                    ? 'GO · This launch window works.'
                    : `WAIT · Moon must be within ${MOON_WINDOW_TOLERANCE_DEGREES}° with clear traffic.`}
                </span>
              </div>
              <p className="moon-launch-note">Traffic uses simplified orbital models, not live satellite tracking.</p>
              <div className="moon-launch-actions">
                <button type="button" className="game__back" onClick={() => setStep('site')}>Back</button>
                <button type="button" className="ms-btn" disabled={!plan.safeWindow} onClick={startLaunch}>Launch</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
