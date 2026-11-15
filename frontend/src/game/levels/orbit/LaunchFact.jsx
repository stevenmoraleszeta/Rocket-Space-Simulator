/**
 * "Did you know?" box shown after a launch. The fact depends on what happened in the flight,
 * so a crash explains why it crashed and a win explains why it worked.
 * Written for players aged 7–12.
 */
import { useSettings } from '../../../settings/SettingsContext.jsx'
import { engineerName, sayTo } from '../../../settings/settingsStore.js'
import { OUTCOMES } from './launchSimulation.js'

/** Off target (km) at or under which a win counts as a bullseye. */
const BULLSEYE_KM = 30

export const LAUNCH_FACTS = {
  bullseye: {
    title: 'The gravity turn',
    text: 'Nice aim! Real rockets go straight up for only a few seconds. Then they lean over until they fly almost flat. That lean is called a gravity turn. Gravity helps bend the path.',
  },
  orbitReached: {
    title: 'Not too steep, not too flat',
    text: 'Lean too soon and thick air slows the rocket down. Lean too late and it wastes fuel going straight up. The right lean saves a lot of fuel.',
  },
  earthImpact: {
    title: 'Up is not enough',
    text: 'Going high is not the same as staying up. A satellite has to fly sideways very fast, about 8 km every second. Then Earth curves away while it falls. That is an orbit.',
  },
  lostInSpace: {
    title: 'Escape speed',
    text: 'At about 11 km every second, a rocket leaves Earth and does not come back. A trip to the Moon or Mars needs that speed. A satellite around Earth does not.',
  },
  missedTooFastOrSlow: {
    title: 'Every height has its speed',
    text: 'Lower paths around Earth are faster. At 700 km up, a satellite needs about 7.5 km every second. Too fast or too slow, and it will not stay on that circle.',
  },
  missedTarget: {
    title: 'One degree matters',
    text: 'Rockets go so fast that being off by one degree can miss by hundreds of kilometers. Real rockets use computers that steer many times every second.',
  },
  satelliteCollision: {
    title: 'A crowded sky',
    text: 'Thousands of satellites and bits of space junk fly around Earth. The space station even moves out of the way a few times a year.',
  },
  noLiftoff: {
    title: 'Push more than you weigh',
    text: 'A rocket lifts off only when the engines push harder than the rocket weighs. The big rocket that went to the Moon was almost all fuel.',
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
  const playerName = engineerName(useSettings().playerName)
  return (
    <section className={`launch-fact ${result.success ? 'is-good' : 'is-bad'} ${className}`}>
      <p className="launch-fact__label">Did you know?</p>
      {playerName && (
        <p className="launch-fact__hi">
          {sayTo(playerName, result.success ? 'Nice flying.' : 'Here is what happened.')}
        </p>
      )}
      <p className="launch-fact__title">{fact.title}</p>
      <p className="launch-fact__text">{fact.text}</p>
    </section>
  )
}
