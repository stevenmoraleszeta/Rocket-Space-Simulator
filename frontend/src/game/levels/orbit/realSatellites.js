/**
 * REAL SATELLITES near the orbits of mission 1. Altitudes are the real ones (approximate, km).
 *
 * Simplification of the 2D view: every satellite moves on a circular orbit in the plane of the
 * launch, at its real orbital speed (√(μ/r)). Start angles are spread out on purpose.
 *
 * HAZARD_RADIUS_KILOMETERS is a game "danger zone": real satellites are only meters wide,
 * but passing within this distance counts as a collision. It is large on purpose so the
 * danger is visible on screen.
 */
export const HAZARD_RADIUS_KILOMETERS = 120

/** Color of each satellite type: before the launch every satellite is only a dot of its type's color. */
export const SATELLITE_KIND_COLORS = {
  'Space station': '#ff8fd8',
  'Space telescope': '#b48bff',
  'Internet satellite': '#4fc3ff',
  'Earth photo satellite': '#3ddc97',
  'Ice measuring satellite': '#e8f6ff',
  'Phone satellite': '#ff9f43',
  'Weather satellite': '#ffd23f',
  'Earth science satellite': '#5ee6e6',
}

/**
 * Every satellite is real. Fields:
 *   name        used in sentences ("It crashes into …")
 *   shortName   label next to it on the map
 *   kind        what type of satellite it is, shown when the player taps it
 *   summary     one short line about what it does
 * Start angles are spread around the planet so no two satellites sit on top of each other.
 */
export const REAL_SATELLITES = [
  {
    id: 'iss', name: 'the International Space Station', shortName: 'ISS', altitudeKm: 420, startAngleDeg: 30,
    kind: 'Space station',
    summary: 'Astronauts from many countries live here and run science experiments.',
  },
  {
    id: 'gpm', name: 'the GPM rain satellite', shortName: 'GPM', altitudeKm: 407, startAngleDeg: 200,
    kind: 'Weather satellite',
    summary: 'NASA and Japan built it to measure rain and snow all over the world.',
  },
  {
    id: 'hubble', name: 'the Hubble telescope', shortName: 'Hubble', altitudeKm: 535, startAngleDeg: 110,
    kind: 'Space telescope',
    summary: 'Takes pictures of faraway stars and galaxies, high above the blurry air.',
  },
  {
    id: 'starlink-1007', name: 'Starlink-1007', shortName: 'Starlink-1007', altitudeKm: 550, startAngleDeg: 262,
    kind: 'Internet satellite',
    summary: 'One of thousands of Starlink satellites that bring internet to the whole planet.',
  },
  {
    id: 'worldview-3', name: 'WorldView-3', shortName: 'WorldView-3', altitudeKm: 617, startAngleDeg: 292,
    kind: 'Earth photo satellite',
    summary: 'Takes very sharp photos of Earth: it can see a single car from space.',
  },
  {
    id: 'icesat-2', name: 'ICESat-2', shortName: 'ICESat-2', altitudeKm: 496, startAngleDeg: 75,
    kind: 'Ice measuring satellite',
    summary: 'Uses a laser to measure how thick the ice at the poles is.',
  },
  {
    id: 'iridium-133', name: 'Iridium 133', shortName: 'Iridium 133', altitudeKm: 780, startAngleDeg: 8,
    kind: 'Phone satellite',
    summary: 'Lets people make phone calls from anywhere, even the middle of the ocean.',
  },
  {
    id: 'suomi-npp', name: 'the Suomi NPP weather satellite', shortName: 'Suomi NPP', altitudeKm: 824, startAngleDeg: 240,
    kind: 'Weather satellite',
    summary: 'Watches clouds and storms so we can forecast the weather.',
  },
  {
    id: 'aqua', name: 'the Aqua satellite', shortName: 'Aqua', altitudeKm: 705, startAngleDeg: 140,
    kind: 'Earth science satellite',
    summary: 'Studies the water on Earth: rain, clouds, oceans and ice.',
  },
  {
    id: 'landsat-9', name: 'Landsat 9', shortName: 'Landsat 9', altitudeKm: 705, startAngleDeg: 320,
    kind: 'Earth photo satellite',
    summary: 'Takes photos of all of Earth to see how forests, farms and cities change.',
  },
  {
    id: 'sentinel-2a', name: 'Sentinel-2A', shortName: 'Sentinel-2A', altitudeKm: 786, startAngleDeg: 160,
    kind: 'Earth photo satellite',
    summary: 'Takes color photos of the land to watch over crops, forests and floods.',
  },
  {
    id: 'noaa-20', name: 'the NOAA-20 weather satellite', shortName: 'NOAA-20', altitudeKm: 824, startAngleDeg: 60,
    kind: 'Weather satellite',
    summary: 'Measures air temperature and clouds all over the world for weather forecasts.',
  },
]
