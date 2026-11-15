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
  moonArrived: {
    title: 'Braking at the Moon',
    text: 'The Moon has almost no air to slow a ship down. Apollo fired its big engine behind the Moon, out of radio contact, to drop into orbit. Nobody on Earth knew if it worked until the ship came around again.',
  },
  moonImpact: {
    title: 'A Moon full of craters',
    text: 'With no air, nothing burns up before it hits the Moon. That is why it is covered in craters. Spacecraft aim to pass beside it, then brake.',
  },
  moonShort: {
    title: 'Aiming at a moving target',
    text: 'The Moon moves about 1 km every second around Earth. A ship that leaves today has to aim at where the Moon will be in about 3 to 5 days.',
  },
  moonPast: {
    title: 'Free return',
    text: 'Apollo 13 lost its main oxygen tank on the way. Its path swung around the Moon and back to Earth on its own, and the crew came home safely.',
  },
  noLander: {
    title: 'No air, no parachute',
    text: 'On Earth, air and parachutes slow a capsule down. At the Moon only a rocket engine can do it, so every lander carries one.',
  },
  moonLowScience: {
    title: 'Space junk is a real problem',
    text: 'There are more than 30,000 tracked pieces of junk around Earth. Even a fleck of paint can crack a window, because it moves faster than a bullet.',
  },
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
  // Mission 3, launch to Mars (marsLaunch/marsLaunchRoute.js)
  marsReached: {
    title: 'The Hohmann road',
    text: 'The cheapest way to Mars is half of an oval around the Sun, from Earth\u2019s orbit to Mars\u2019s. Rockets can only use it about every 26 months, when Mars is the right distance ahead of Earth.',
  },
  marsMissed: {
    title: 'Aim where Mars will be',
    text: 'Mars moves about half a degree around the Sun every day. Mission teams aim at the spot where Mars will be months later, not where it is on launch day.',
  },
  marsShort: {
    title: 'Faster than Earth',
    text: 'To reach Mars, a rocket has to go even faster around the Sun than Earth does, about 3 km every second faster. Too slow, and it never climbs out to Mars\u2019s orbit.',
  },
  marsDecision: {
    title: 'Practice for every surprise',
    text: 'Astronauts train for years on Earth for problems that might happen in space. When something goes wrong, they stay calm, follow a plan and talk to mission control.',
  },
  marsHazard: {
    title: 'Junk around the Sun',
    text: 'Old rocket stages from the Moon missions still circle the Sun. Space is mostly empty, but navigators keep track of every known object near a spacecraft\u2019s path.',
  },
  satelliteCollision: {
    title: 'A crowded sky',
    text: 'Thousands of satellites and bits of space junk fly around Earth. The space station even moves out of the way a few times a year.',
  },
  // Loadout failures (launchFailure.js): one fact for each reason.
  overBudget: {
    title: 'Space is expensive',
    text: 'One launch can cost millions of dollars. Some companies now land their boosters and fly them again, which makes launches much cheaper.',
  },
  tooHeavy: {
    title: 'Every kilo counts',
    text: "Most of a rocket's weight at liftoff is fuel, almost nine parts out of ten. Every extra kilo needs even more fuel to lift it.",
  },
  noCrew: {
    title: 'Someone has to fly it',
    text: 'Astronauts train for years before their first flight. Even rockets that fly themselves have a team on the ground watching every second.',
  },
  noPower: {
    title: 'Power from the Sun',
    text: 'The space station gets its power from huge solar panels, about as wide as a football field. Without power, the air and the heat in the cabin stop working.',
  },
  food: {
    title: 'Space food',
    text: 'Each astronaut needs about 1.8 kg of food every day, packaging included. NASA packs food for every day of the trip, plus some extra.',
  },
  oxygen: {
    title: 'Air to breathe',
    text: 'Each astronaut breathes about 0.84 kg of oxygen every day. The space station makes new oxygen by splitting water.',
  },
  water: {
    title: 'Every drop counts',
    text: "The space station cleans and reuses almost all of its water, even sweat and the water in pee. Yesterday's water becomes tomorrow's drink!",
  },
  spaceSick: {
    title: 'Space sickness',
    text: 'Many astronauts feel sick their first days in space. Floating confuses the part of the ear that helps us keep our balance.',
  },
  noBoosters: {
    title: 'A big push to start',
    text: 'Boosters give a rocket extra push at liftoff. On the Space Shuttle, the two side boosters gave most of the push to leave the ground.',
  },
  noShield: {
    title: 'Hot, hot, hot',
    text: 'Rushing through the air makes a rocket very hot. Coming back from the Moon, the Apollo heat shield got hotter than lava!',
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
    case 'moonArrived':
    case 'moonImpact':
    case 'moonShort':
    case 'moonPast':
    case 'noLander':
    case 'moonLowScience':
      return LAUNCH_FACTS[outcome.type]
    // Loadout failures (launchFailure.js ids)
    case 'overBudget':
    case 'tooHeavy':
    case 'noCrew':
    case 'noPower':
    case 'noBoosters':
    case 'noShield':
      return LAUNCH_FACTS[outcome.type]
    case 'noFood':
    case 'outOfFood':
      return LAUNCH_FACTS.food
    case 'noAir':
    case 'outOfAir':
      return LAUNCH_FACTS.oxygen
    case 'noWater':
    case 'outOfWater':
      return LAUNCH_FACTS.water
    case 'spaceSick':
      return LAUNCH_FACTS.spaceSick
    case 'marsReached':
    case 'marsMissed':
    case 'marsShort':
    case 'marsHazard':
    case 'marsDecision':
      return LAUNCH_FACTS[outcome.type]
    default:
      return result.reachedArrival ? LAUNCH_FACTS.missedTooFastOrSlow : LAUNCH_FACTS.missedTarget
  }
}

export function LaunchFact({ result, className = '', label = 'Did you know?' }) {
  const fact = factForResult(result)
  const playerName = engineerName(useSettings().playerName)
  return (
    <section className={`launch-fact ${result.success ? 'is-good' : 'is-bad'} ${className}`}>
      <p className="launch-fact__label">{label}</p>
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
