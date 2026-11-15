/**
 * REAL LAUNCH SITES — every one is a real city with a spaceport. Coordinates are the real ones
 * (degrees, north and east positive). `name` is the city, `spaceport` the launch site there.
 *
 * In the 2D orbit view the Earth is seen from above the North Pole: the pole is the
 * center, the South Pole is the rim, and each site sits on its country at its real
 * latitude and longitude. The latitude still matters physically:
 *   - an orbit can never be tilted less than the site's latitude (minimum inclination = |latitude|),
 *   - the Earth's spin pushes the rocket by ω·R·cos(inclination) (see rotationBoostForInclination).
 *
 * allowsEastward / allowsPolar say whether rockets can fly in that direction safely,
 * over the sea or empty land instead of over towns.
 *
 * United States sites are listed first. Coordinates are the real pads NASA has used:
 * Kennedy Pad 39B, Vandenberg SLC-3E (Landsat 9) and Kodiak Pad 1 (Kodiak Star).
 * The later sites are partner countries where a NASA mission has actually launched.
 * Russian launch sites are omitted, including Baikonur, which Russia operates.
 */
export const LAUNCH_SITES = [
  {
    id: 'lompoc',
    name: 'Lompoc',
    country: 'USA',
    spaceport: 'Vandenberg Space Force Base, Space Launch Complex 3 East',
    latitudeDeg: 34.64,
    longitudeDeg: -120.59,
    allowsEastward: false,
    allowsPolar: true,
    why: 'Rockets fly south over the Pacific Ocean, so they reach polar orbits without passing over cities.',
    whatFor: 'Polar and sun-synchronous orbits. NASA launched Landsat 9 from this pad in 2021.',
  },
  {
    id: 'kodiak',
    name: 'Kodiak',
    country: 'USA',
    spaceport: 'Pacific Spaceport Complex – Alaska, Launch Pad 1',
    latitudeDeg: 57.44,
    longitudeDeg: -152.34,
    allowsEastward: false,
    allowsPolar: true,
    why: 'An island with open Pacific Ocean to the south, so rockets can fly steep polar paths without crossing cities.',
    whatFor: 'NASA\'s Kodiak Star satellites launched from here in 2001. This far north, the space-station orbit is impossible.',
  },
  {
    id: 'kennedy',
    name: 'Kennedy',
    country: 'USA',
    spaceport: 'Kennedy Space Center, Launch Pad 39B',
    latitudeDeg: 28.63,
    longitudeDeg: -80.62,
    allowsEastward: true,
    allowsPolar: false,
    why: 'NASA\'s pad for crewed rockets. They fly east over the Atlantic and get a push from the spin of the Earth.',
    whatFor: 'Apollo, the Space Shuttle and Artemis left from here. A polar launch would fly over towns.',
  },
  {
    id: 'kourou',
    name: 'Kourou',
    country: 'French Guiana',
    spaceport: 'Guiana Space Centre',
    latitudeDeg: 5.2,
    longitudeDeg: -52.8,
    allowsEastward: true,
    allowsPolar: true,
    why: 'Very close to the equator, where the spin of the Earth gives the biggest push. Open ocean to the north and east.',
    whatFor: 'Low-tilt orbits and big satellites. NASA\'s James Webb Space Telescope launched from here in 2021.',
  },
  {
    id: 'sullurpeta',
    name: 'Sullurpeta',
    country: 'India',
    spaceport: 'Satish Dhawan Space Centre, on Sriharikota island',
    latitudeDeg: 13.7,
    longitudeDeg: 80.2,
    allowsEastward: true,
    allowsPolar: true,
    why: 'An island on the Bay of Bengal: rockets go east or south over the sea.',
    whatFor: 'Earth-imaging satellites. NASA and India launched NISAR from here in 2025.',
  },
  {
    id: 'minamitane',
    name: 'Minamitane',
    country: 'Japan',
    spaceport: 'Tanegashima Space Center',
    latitudeDeg: 30.4,
    longitudeDeg: 131.0,
    allowsEastward: true,
    allowsPolar: true,
    why: 'At the southern tip of Tanegashima island: rockets fly east or south over the Pacific Ocean, away from towns.',
    whatFor: 'Weather satellites, and cargo ships that Japan flies to the space station for NASA.',
  },
  {
    id: 'mahia',
    name: 'Mahia',
    country: 'New Zealand',
    spaceport: 'Rocket Lab Launch Complex 1',
    latitudeDeg: -39.3,
    longitudeDeg: 177.9,
    allowsEastward: true,
    allowsPolar: true,
    why: 'A small peninsula with open ocean all around, so small rockets can fly almost any direction.',
    whatFor: 'Small satellites. NASA\'s CAPSTONE Moon mission launched from here in 2022.',
  },
]
