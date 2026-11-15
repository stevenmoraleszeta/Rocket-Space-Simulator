export const MOON_VIEW = {
  width: 400,
  height: 600,
  earth: { x: 0.5, y: 0.84, radius: 0.13, gravity: 0.7 },
  moon: { x: 0.5, y: 0.14, radius: 0.065, gravity: 0.15, captureRadius: 0.12 },
  launch: { x: 0.5, y: 0.695 },
  asteroids: [
    { x: 0.24, y: 0.49, radius: 0.025 },
    { x: 0.73, y: 0.39, radius: 0.028 },
    { x: 0.36, y: 0.27, radius: 0.022 },
  ],
}

const STEP = 0.016
const MAX_TIME = 3.2
const EPSILON = 0.0004

function gravityAt(position, velocity, view) {
  let vx = velocity.x
  let vy = velocity.y
  for (const body of [view.earth, view.moon]) {
    const dx = body.x - position.x
    const dy = body.y - position.y
    const distanceSquared = dx * dx + dy * dy
    const distance = Math.sqrt(distanceSquared)
    if (distance === 0) continue
    const acceleration = body.gravity * body.radius ** 2 / (distanceSquared + EPSILON)
    vx += (dx / distance) * acceleration * STEP
    vy += (dy / distance) * acceleration * STEP
  }
  return { x: vx, y: vy }
}

export function advanceMoonFlight(position, velocity, asteroids = MOON_VIEW.asteroids, view = MOON_VIEW) {
  const nextVelocity = gravityAt(position, velocity, view)
  const nextPosition = {
    x: position.x + nextVelocity.x * STEP,
    y: position.y + nextVelocity.y * STEP,
  }
  const moonDistance = Math.hypot(nextPosition.x - view.moon.x, nextPosition.y - view.moon.y)
  if (moonDistance <= view.moon.captureRadius) return { position: nextPosition, velocity: nextVelocity, outcome: 'orbit' }

  const earthDistance = Math.hypot(nextPosition.x - view.earth.x, nextPosition.y - view.earth.y)
  if (earthDistance <= view.earth.radius) return { position: nextPosition, velocity: nextVelocity, outcome: 'earth-impact' }

  if (asteroids.some((rock) => Math.hypot(nextPosition.x - rock.x, nextPosition.y - rock.y) <= rock.radius)) {
    return { position: nextPosition, velocity: nextVelocity, outcome: 'debris-impact' }
  }

  if (nextPosition.x < 0 || nextPosition.x > 1 || nextPosition.y < 0 || nextPosition.y > 1) {
    return { position: nextPosition, velocity: nextVelocity, outcome: 'lost' }
  }

  return { position: nextPosition, velocity: nextVelocity, outcome: null }
}

export function launchVelocity(start, pointer, thrustFactor = 1, view = MOON_VIEW) {
  const dx = (start.x - pointer.x) / view.width
  const dy = (start.y - pointer.y) / view.height
  const length = Math.hypot(dx, dy)
  if (length < 0.025) return null
  const speed = Math.min(1.35, length * 3.4) * thrustFactor
  return { x: (dx / length) * speed, y: (dy / length) * speed }
}

export function simulateMoonFlight(initialVelocity, asteroids = MOON_VIEW.asteroids, view = MOON_VIEW) {
  const position = { ...view.launch }
  let velocity = { ...initialVelocity }
  const points = [position]
  let elapsed = 0

  while (elapsed < MAX_TIME) {
    const step = advanceMoonFlight(position, velocity, asteroids, view)
    position.x = step.position.x
    position.y = step.position.y
    velocity = step.velocity
    elapsed += STEP
    points.push({ ...position })

    if (step.outcome) return { points, outcome: step.outcome, elapsed }
  }

  return { points, outcome: 'missed', elapsed }
}
