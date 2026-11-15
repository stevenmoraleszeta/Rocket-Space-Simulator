import { useEffect, useMemo, useRef, useState } from 'react'
import { LAUNCH_SITES } from '../orbit/launchSites.js'
import { MOON_VIEW, advanceMoonFlight, launchVelocity, simulateMoonFlight } from './moonPhysics.js'
import { createMoonFlightView, formatLaunchDate, parseLaunchDate } from './moonLaunchPlanning.js'
import moonSprite from '../../../levels/assets/moon.svg'

const OUTCOME_TEXT = {
  'earth-impact': 'The probe fell back to Earth.',
  'debris-impact': 'The probe hit space debris.',
  lost: 'The probe drifted out of its path.',
  missed: 'The probe missed the Moon’s capture zone.',
}

function toScenePoint(event, element, view) {
  const bounds = element.getBoundingClientRect()
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * view.width,
    y: ((event.clientY - bounds.top) / bounds.height) * view.height,
  }
}

function toPath(points, view) {
  return points.map((point, index) => {
    const x = point.x * view.width
    const y = point.y * view.height
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

export function MoonFlight({ metrics, attemptsLimit, launchContext, onOrbit, onAttemptsOver, onAttemptsUpdate }) {
  const launchSite = LAUNCH_SITES.find((candidate) => candidate.id === launchContext?.siteId)
  const launchDate = launchContext ? parseLaunchDate(launchContext.launchDate) : null
  const view = useMemo(
    () => {
      if (!launchSite || !launchContext?.launchDate) return MOON_VIEW
      const date = parseLaunchDate(launchContext.launchDate)
      return date ? createMoonFlightView(launchSite, date) : MOON_VIEW
    },
    [launchContext?.launchDate, launchSite],
  )
  const start = useMemo(
    () => ({ x: view.launch.x * view.width, y: view.launch.y * view.height }),
    [view],
  )
  const [phase, setPhase] = useState('aim')
  const [attemptsLeft, setAttemptsLeft] = useState(attemptsLimit)
  const [dragPoint, setDragPoint] = useState(null)
  const [position, setPosition] = useState(view.launch)
  const [route, setRoute] = useState([])
  const [fuelLeft, setFuelLeft] = useState(metrics.fuel)
  const [message, setMessage] = useState('Drag back from Earth, then release to launch.')
  const simulation = useRef(null)
  const pathRef = useRef([])
  const boostFuel = 8
  const massFactor = Math.max(0.45, Math.min(1, metrics.rocket.capacity / metrics.mass))
  const powerFactor = Math.max(0.35, Math.min(1.35, (metrics.thrust / 55) * massFactor))

  const aimVelocity = useMemo(
    () => dragPoint && launchVelocity(start, dragPoint, powerFactor, view),
    [dragPoint, powerFactor, start, view],
  )
  const predicted = useMemo(
    () => aimVelocity && simulateMoonFlight(aimVelocity, view.asteroids, view),
    [aimVelocity, view],
  )

  useEffect(() => {
    if (phase !== 'flying') return undefined
    let frameId
    let ticks = 0
    const animate = () => {
      const current = simulation.current
      if (!current) return
      const next = advanceMoonFlight(current.position, current.velocity, view.asteroids, view)
      current.position = next.position
      current.velocity = next.velocity
      current.elapsed += 0.016
      pathRef.current.push(next.position)
      if (pathRef.current.length > 200) pathRef.current.shift()
      ticks += 1
      if (ticks % 3 === 0) {
        setPosition(next.position)
        setRoute([...pathRef.current])
      }

      if (next.outcome === 'orbit') {
        setPosition(next.position)
        setPhase('orbit')
        setMessage('In lunar orbit! The Moon is captured.')
        onOrbit(fuelLeft - 45)
        return
      }
      if (next.outcome || current.elapsed >= 3.2) {
        const reason = next.outcome ?? 'missed'
        const nextAttempts = attemptsLeft - 1
        setAttemptsLeft(nextAttempts)
        onAttemptsUpdate(nextAttempts)
        simulation.current = null
        setPosition(view.launch)
        setRoute([])
        setMessage(`${OUTCOME_TEXT[reason]} ${nextAttempts > 0 ? `${nextAttempts} attempt${nextAttempts === 1 ? '' : 's'} left.` : ''}`)
        setPhase(nextAttempts > 0 ? 'aim' : 'over')
        if (nextAttempts <= 0) onAttemptsOver(OUTCOME_TEXT[reason])
        return
      }
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [phase, attemptsLeft, fuelLeft, onAttemptsOver, onOrbit, onAttemptsUpdate, view])

  function pointerDown(event) {
    if (phase === 'orbit' || phase === 'over') return
    const point = toScenePoint(event, event.currentTarget, view)
    if (phase === 'aim') {
      if (Math.hypot(point.x - start.x, point.y - start.y) > 105) {
        setMessage('Start your drag at the probe on Earth.')
        return
      }
      setDragPoint(point)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (phase === 'flying') boostToward(point)
  }

  function pointerMove(event) {
    if (phase !== 'aim' || !dragPoint) return
    setDragPoint(toScenePoint(event, event.currentTarget, view))
  }

  function pointerUp(event) {
    if (phase !== 'aim' || !dragPoint) return
    const point = toScenePoint(event, event.currentTarget, view)
    const velocity = launchVelocity(start, point, powerFactor, view)
    if (!velocity) {
      setDragPoint(null)
      setMessage('Pull farther back to launch.')
      return
    }
    simulation.current = { position: { ...view.launch }, velocity, elapsed: 0 }
    pathRef.current = [{ ...view.launch }]
    setPosition(view.launch)
    setRoute([])
    setDragPoint(null)
    setMessage('Flying! Tap ahead to use fuel and steer.')
    setPhase('flying')
  }

  function boostToward(point) {
    if (fuelLeft - boostFuel < 45) {
      setMessage('Keep 45 fuel for lunar braking.')
      return
    }
    const current = simulation.current
    if (!current) return
    const dx = point.x / view.width - current.position.x
    const dy = point.y / view.height - current.position.y
    const length = Math.hypot(dx, dy) || 1
    current.velocity = {
      x: current.velocity.x + (dx / length) * 0.24 * powerFactor,
      y: current.velocity.y + (dy / length) * 0.24 * powerFactor,
    }
    setFuelLeft((fuel) => Math.max(0, fuel - boostFuel))
    setMessage('Thrusters on! The probe is steering toward your tap.')
  }

  function boostToMoon() {
    boostToward({
      x: view.moon.x * view.width,
      y: view.moon.y * view.height,
    })
  }

  return (
    <main className="moon-flight">
      <header className="moon-flight__head">
        <p className="moon-kicker">MISSION 2 · EARTH TO MOON</p>
        <h1>Gravity slingshot</h1>
        {launchSite && launchDate && <p>{launchSite.name} · {formatLaunchDate(launchDate)}</p>}
        <p>{message}</p>
      </header>
      <div className="moon-flight__layout">
        <svg
          className="moon-flight__map"
          viewBox={`0 0 ${view.width} ${view.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Drag a probe from Earth to the Moon. The dotted line previews its path."
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <defs>
            <radialGradient id="moon-earth-fill">
              <stop stopColor="#52a9c5" />
              <stop offset="1" stopColor="#193b78" />
            </radialGradient>
          </defs>
          <rect width={view.width} height={view.height} fill="#071328" />
          {Array.from({ length: 28 }, (_, index) => (
            <circle key={index} cx={(index * 83 + 17) % view.width} cy={(index * 137 + 31) % view.height} r={index % 4 === 0 ? 2 : 1} fill="#b9d8ec" opacity=".8" />
          ))}
          <circle cx={view.moon.x * view.width} cy={view.moon.y * view.height} r={view.moon.captureRadius * view.height} fill="none" stroke="#90d5ff" strokeDasharray="5 6" strokeWidth="2" />
          <image
            href={moonSprite}
            x={(view.moon.x - view.moon.radius) * view.width}
            y={(view.moon.y - view.moon.radius) * view.height}
            width={view.moon.radius * 2 * view.width}
            height={view.moon.radius * 2 * view.height}
            preserveAspectRatio="xMidYMid meet"
          />
          <circle cx={view.earth.x * view.width} cy={view.earth.y * view.height} r={view.earth.radius * view.height} fill="url(#moon-earth-fill)" />
          <text
            x={view.moon.x * view.width}
            y={(view.moon.y + view.moon.captureRadius) * view.height + 16}
            textAnchor="middle"
            fill="#f3f5ff"
            fontSize="12"
          >MOON · CAPTURE ZONE</text>
          <text
            x={view.earth.x * view.width}
            y={(view.earth.y + view.earth.radius) * view.height + 16}
            textAnchor="middle"
            fill="#f3f5ff"
            fontSize="12"
          >EARTH</text>
          {view.asteroids.map((rock, index) => (
            <g key={index} aria-label="Space debris">
              <path
                d={`M${(rock.x - rock.radius) * view.width} ${rock.y * view.height}l${rock.radius * 300} ${-rock.radius * 500}l${rock.radius * 500} ${rock.radius * 180}l${-rock.radius * 50} ${rock.radius * 400}z`}
                fill="#c59068"
              />
            </g>
          ))}
          {predicted?.points && phase === 'aim' && (
            <path d={toPath(predicted.points, view)} fill="none" stroke="#ffe38a" strokeDasharray="4 7" strokeWidth="3" />
          )}
          {phase === 'aim' && dragPoint && (
            <line x1={start.x} y1={start.y} x2={dragPoint.x} y2={dragPoint.y} stroke="#fff" strokeWidth="2" />
          )}
          {route.length > 1 && <path d={toPath(route, view)} fill="none" stroke="#7ee0c1" strokeWidth="3" />}
          {phase !== 'orbit' && phase !== 'over' && (
            <g transform={`translate(${position.x * view.width} ${position.y * view.height})`}>
              <path d="M0 -10l7 14-7-3-7 3z" fill="#fff1aa" stroke="#182341" strokeWidth="2" />
              <circle r="4" fill="#ffb24c" />
            </g>
          )}
        </svg>
        <aside className="moon-flight__panel">
          <p className="moon-flight__tip"><b>🎯 Aim:</b> Drag back from the launch marker, then release.</p>
          <p className="moon-flight__tip"><b>🪐 Gravity:</b> Earth and Moon curve the route.</p>
          <p className="moon-flight__tip"><b>🪨 Watch out:</b> Steer around the rocks.</p>
          <div className="moon-flight__meter">
            <span>⛽ Fuel · {fuelLeft} / {metrics.fuel}</span>
            <span className="moon-flight__track"><span style={{ width: `${metrics.fuel ? (fuelLeft / metrics.fuel) * 100 : 0}%` }} /></span>
          </div>
          <p className="moon-flight__attempts" aria-live="polite">🚀 Attempts left: {attemptsLeft}</p>
          {phase === 'flying' && (
            <button type="button" className="moon-button" onClick={boostToMoon} disabled={fuelLeft - boostFuel < 45}>
              Boost toward Moon
            </button>
          )}
          {phase === 'aim' && (
            <p className="moon-flight__hint">A dotted line shows the predicted route.</p>
          )}
          {phase === 'over' && <p className="moon-alert">No attempts left. Redesign your rocket.</p>}
        </aside>
      </div>
    </main>
  )
}
