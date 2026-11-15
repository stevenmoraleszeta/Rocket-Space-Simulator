/**
 * LAUNCH WINDOWS — three real kinds of Earth–Moon trip.
 * The player picks one the way mission 1 picks a launch base.
 *
 * July 1969 is Apollo 11: launch 16 July, splashdown 24 July, 8 days 3 hours.
 * The coast to the Moon was a free-return path. NASA mission report.
 * The south-pole path is the kind Artemis is built for. LCROSS hit Cabeus
 * crater on 9 October 2009 and found water ice. Earth sits low on the horizon
 * there, so a radio can lose the crew.
 * August 1972 is the solar particle event between Apollo 16 and Apollo 17.
 * No crew was flying. Apollo 17 itself lasted 12 days 14 hours.
 */

export const MOON_WINDOWS = Object.freeze([
  {
    id: 'apollo11',
    name: 'July 1969',
    detail: '8 days',
    x: 0.16,
    y: 0.42,
    durationDays: 8,
    corridorHalf: 0.12,
    storm: false,
    blackout: false,
    why: 'Apollo 11 left Earth on 16 July 1969 and came home 8 days later. The path was a free return: if the big engine had failed, the Moon’s pull would have bent the ship back toward Earth.',
    whatFor: 'About 384,400 km. The crew crossed the radiation belts in about an hour, through a thin edge, and made one small engine firing on the way. Aim for the middle of the gate.',
  },
  {
    id: 'south-pole',
    name: 'South pole',
    detail: 'Dark ice',
    x: 0.16,
    y: -0.42,
    durationDays: 8,
    corridorHalf: 0.065,
    storm: false,
    blackout: true,
    why: 'Some crater floors near the south pole never see the Sun. In 2009 NASA crashed a rocket into Cabeus crater and found ice. Earth sits very low in the sky there.',
    whatFor: 'The landing gate is narrow, and the radio can lose the ship when the crater rim blocks Earth. Meals for 8 days still fit. The call home may not.',
  },
  {
    id: 'storm',
    name: 'August 1972',
    detail: '12 days',
    x: 0.52,
    y: 0.44,
    durationDays: 12,
    corridorHalf: 0.1,
    storm: true,
    blackout: false,
    why: 'No crew was flying in August 1972, when the Sun threw a huge storm of fast particles. It fell between Apollo 16 and Apollo 17. Apollo 17’s own trip lasted about 12 days.',
    whatFor: 'This path is longer, so eight days of meals and water run out. The crew also needs a safe room when the storm hits. The radio for the south pole may not fit as well.',
  },
])

export const windowById = (id) => MOON_WINDOWS.find((item) => item.id === id) ?? null
