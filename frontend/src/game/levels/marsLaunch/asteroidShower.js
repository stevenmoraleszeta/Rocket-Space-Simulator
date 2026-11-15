/**
 * ASTEROID SHOWER mini-game on the way to Mars (no React, no pixels).
 *
 * A swarm of rocks that escaped the asteroid belt rains down. The rocket sits at the bottom of the
 * field and slides left and right after the mouse (or the arrow keys, or a finger) to dodge them.
 *   - SHOWER_SECONDS long; rocks fall faster and come more often as time goes on
 *   - SIDE_SHARE of the rocks fall near the left and right edges, so hiding at a side is not safe
 *   - rocks come in three sizes (rockRadius): small pebbles, rocks and a few big boulders
 *   - each hit breaks one of SHIELDS shields and costs HIT_PENALTY points
 *   - losing every shield breaks the ship apart
 * Units are pixels of the small field (FIELD_W × FIELD_H) and seconds.
 */

export const FIELD_W = 160
export const FIELD_H = 120
export const SHOWER_SECONDS = 15
export const SHIELDS = 3
export const HIT_PENALTY = 10

/** The rocket: its center x moves, its y is fixed near the bottom. */
export const SHIP = { y: FIELD_H - 14, halfWidth: 4, halfHeight: 6, speed: 170 }
/** Share of the rocks that fall in the side strips, and how wide each strip is (part of the field). */
export const SIDE_SHARE = 0.3
export const SIDE_STRIP = 0.25

/** Where a new rock starts (x): often near the edges, otherwise anywhere. */
export function rockStartX(random, r) {
  const span = FIELD_W - 2 * r
  if (random() < SIDE_SHARE) {
    const offset = random() * span * SIDE_STRIP
    return random() < 0.5 ? r + offset : FIELD_W - r - offset
  }
  return r + random() * span
}

/**
 * Rock sizes (radius in field pixels): many small pebbles, some middle rocks and a few big
 * boulders, so the shower does not look like copies of the same rock.
 */
export function rockRadius(random) {
  const roll = random()
  if (roll < 0.45) return 2 + Math.floor(random() * 2) // pebble: 2–3
  if (roll < 0.85) return 4 + Math.floor(random() * 2) // rock: 4–5
  return 7 + Math.floor(random() * 3) // boulder: 7–9
}

/** After a hit the ship blinks and cannot be hit again for this long. */
export const HIT_GRACE_SECONDS = 1

/** Small deterministic random, so a shower can be replayed in tests. */
export function seededRandom(seed) {
  let state = seed % 2147483647 || 1
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}

export function createShower(seed = Date.now()) {
  return {
    time: 0,
    shipX: FIELD_W / 2,
    rocks: [],
    nextRock: 0.4,
    shields: SHIELDS,
    hits: 0,
    graceUntil: 0,
    random: seededRandom(seed),
    over: false,
    survived: false,
  }
}

/** Seconds between rocks and their speed at a moment of the shower: it gets harder. */
export function difficultyAt(time) {
  const k = Math.min(1, time / SHOWER_SECONDS)
  return { gap: 0.42 - 0.25 * k, speed: 36 + 40 * k }
}

/** Where the player wants the ship (field x), clamped to the field. */
export function clampShipX(x) {
  return Math.max(SHIP.halfWidth + 1, Math.min(FIELD_W - SHIP.halfWidth - 1, x))
}

function hitsShip(rock, shipX) {
  // A rock is a circle; the ship is a box. Close enough counts as a hit.
  const dx = Math.max(Math.abs(rock.x - shipX) - SHIP.halfWidth, 0)
  const dy = Math.max(Math.abs(rock.y - SHIP.y) - SHIP.halfHeight, 0)
  return dx * dx + dy * dy < rock.r * rock.r * 0.6
}

/**
 * Moves the shower forward by dt seconds. `targetX` is where the player points (field x), or null.
 * Returns the hits that happened in this step (0 or 1).
 */
export function stepShower(shower, dt, targetX) {
  if (shower.over) return 0
  shower.time += dt
  if (targetX != null) {
    const want = clampShipX(targetX)
    const move = Math.max(-SHIP.speed * dt, Math.min(SHIP.speed * dt, want - shower.shipX))
    shower.shipX = clampShipX(shower.shipX + move)
  }
  // New rocks from the top, faster and more often as time goes on
  const level = difficultyAt(shower.time)
  shower.nextRock -= dt
  while (shower.nextRock <= 0 && shower.time < SHOWER_SECONDS - 0.6) {
    const r = rockRadius(shower.random)
    shower.rocks.push({
      x: rockStartX(shower.random, r),
      y: -r,
      r,
      speed: level.speed * (0.8 + shower.random() * 0.45),
      drift: (shower.random() - 0.5) * 14,
      spin: shower.random() * 8,
    })
    shower.nextRock += level.gap * (0.7 + shower.random() * 0.6)
  }
  let hits = 0
  for (const rock of shower.rocks) {
    rock.y += rock.speed * dt
    rock.x += rock.drift * dt
    if (!rock.gone && shower.time >= shower.graceUntil && hitsShip(rock, shower.shipX)) {
      rock.gone = true
      hits += 1
      shower.hits += 1
      shower.shields -= 1
      shower.graceUntil = shower.time + HIT_GRACE_SECONDS
    }
  }
  shower.rocks = shower.rocks.filter((rock) => !rock.gone && rock.y - rock.r < FIELD_H)
  if (shower.shields <= 0) {
    shower.over = true
    shower.survived = false
  } else if (shower.time >= SHOWER_SECONDS) {
    shower.over = true
    shower.survived = true
  }
  return hits
}
