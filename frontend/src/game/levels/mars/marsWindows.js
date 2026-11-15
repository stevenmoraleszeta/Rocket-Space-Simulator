/**
 * LAUNCH WINDOWS — three real kinds of Earth–Mars trip.
 * The player picks one the way mission 1 picks a launch base.
 *
 * July 2020 is Perseverance: 203 days, no dust storm, no solar conjunction on the cruise.
 * May 2018 is InSight’s launch. A planet-wide dust storm was underway when it was
 * in flight; Opportunity sent its last message on 10 June 2018. The gate is tighter.
 * The third window is a solar conjunction cruise: about every 26 months the Sun
 * stands between Earth and Mars and NASA stops sending commands for about two weeks.
 * This practice path is the shorter 180 days, so the meal locker can feed the crew
 * without the extra meal packs — the mass those packs would have used can carry a radio.
 */

export const MARS_WINDOWS = Object.freeze([
  {
    id: 'perseverance',
    name: 'July 2020',
    detail: 'Clear cruise',
    x: 0.18,
    y: 0.44,
    durationDays: 203,
    corridorHalf: 0.1,
    conjunction: false,
    dust: false,
    why: 'Perseverance left Earth on 30 July 2020 and landed 203 days later, on 18 February 2021. The sky at Mars was clear enough for a careful landing.',
    whatFor: 'About 471 million km. On the way the team fired the engines a few times to stay on the path. You still have to thread the rocks and the gate.',
  },
  {
    id: 'dust',
    name: 'May 2018',
    detail: 'Dust storm',
    x: 0.18,
    y: -0.44,
    durationDays: 203,
    corridorHalf: 0.055,
    conjunction: false,
    dust: true,
    why: 'InSight launched in May 2018. That year a dust storm covered Mars. Opportunity, which ran on sunlight, went quiet on 10 June 2018.',
    whatFor: 'The landing gate gets narrow when the air is full of dust. Aim for the middle. A rover that carries its own heat source can still work in the dark.',
  },
  {
    id: 'conjunction',
    name: 'Behind the Sun',
    detail: '180 days',
    x: 0.5,
    y: 0.46,
    durationDays: 180,
    corridorHalf: 0.1,
    conjunction: true,
    dust: false,
    why: 'About every two years Mars and Earth are on opposite sides of the Sun. Radios get noisy for about two weeks. NASA lets the robots follow a plan they already have.',
    whatFor: 'This path is shorter, 180 days, but the Sun blocks calls home. Without a radio the ship drifts. Meals for the long path may not fit once the radio is aboard.',
  },
])

export const windowById = (id) => MARS_WINDOWS.find((item) => item.id === id) ?? null
