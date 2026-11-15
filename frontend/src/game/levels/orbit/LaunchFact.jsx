/**
 * "Did you know?" box shown after a launch. The fact depends on what happened in the flight,
 * so a crash explains why it crashed and a win explains why it worked.
 * Written for players aged 8–15.
 */
import { OUTCOMES } from './launchSimulation.js'

/** Off target (km) at or under which a win counts as a bullseye. */
const BULLSEYE_KM = 30

export const LAUNCH_FACTS = {
  bullseye: {
    title: 'The gravity turn',
    text: 'You nailed it! Real rockets go straight up for only a few seconds, then slowly tilt over until they fly almost flat. Engineers call it a "gravity turn": gravity helps bend the path.',
  },
  orbitReached: {
    title: 'Not too steep, not too flat',
    text: 'Tilt too early and the rocket pushes through thick air and slows down. Tilt too late and it wastes fuel climbing straight up. The right angle saves a lot of fuel!',
  },
  earthImpact: {
    title: 'Up is not enough',
    text: 'Going high is not the same as staying up. A satellite must fly sideways very fast, about 7.8 km every second, so the ground curves away below it while it falls. That is what an orbit is!',
  },
  lostInSpace: {
    title: 'Escape speed',
    text: 'At about 11.2 km per second, a rocket escapes Earth\'s gravity for good and never comes back. Probes going to the Moon or Mars need that much speed, but a satellite does not.',
  },
  missedTooFastOrSlow: {
    title: 'Every height has its speed',
    text: 'The lower an orbit, the faster you must go to stay in it. At 700 km a satellite needs about 7.5 km/s. Arrive faster or slower, and it will not stay on that circle.',
  },
  missedTarget: {
    title: 'One degree matters',
    text: 'At rocket speeds, a tilt that is off by just one degree can miss the target by hundreds of kilometers. That is why computers steer real rockets many times every second.',
  },
  satelliteCollision: {
    title: 'A crowded sky',
    text: 'Tens of thousands of satellites and pieces of space junk are tracked around Earth. Even the International Space Station moves out of the way of debris a few times a year.',
  },
  noLiftoff: {
    title: 'Push more than you weigh',
    text: 'A rocket only lifts off when its engines push harder than its own weight. The giant Saturn V that flew to the Moon weighed almost 3,000 tonnes, and most of it was fuel!',
  },
}

/** Fact that matches what happened in the flight. */
export function factForResult(result) {
  const { outcome } = result
  switch (outcome.type) {
    case OUTCOMES.ORBIT_REACHED:
      return outcome.missKm <= BULLSEYE_KM ? LAUNCH_FACTS.bullseye : LAUNCH_FACTS.orbitReached
    case OUTCOMES.EARTH_IMPACT:
      return LAUNCH_FACTS.earthImpact
    case OUTCOMES.LOST_IN_SPACE:
      return LAUNCH_FACTS.lostInSpace
    case OUTCOMES.SATELLITE_COLLISION:
      return LAUNCH_FACTS.satelliteCollision
    case OUTCOMES.NO_LIFTOFF:
      return LAUNCH_FACTS.noLiftoff
    default:
      return result.reachedArrival ? LAUNCH_FACTS.missedTooFastOrSlow : LAUNCH_FACTS.missedTarget
  }
}

export function LaunchFact({ result, className = '' }) {
  const fact = factForResult(result)
  return (
    <section className={`launch-fact ${result.success ? 'is-good' : 'is-bad'} ${className}`}>
      <p className="launch-fact__label">Did you know?</p>
      <p className="launch-fact__title">{fact.title}</p>
      <p className="launch-fact__text">{fact.text}</p>
    </section>
  )
}
