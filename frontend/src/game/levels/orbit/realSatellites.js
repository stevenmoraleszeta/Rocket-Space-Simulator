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

/** A Starlink "train": several satellites one behind the other, like right after a real launch. */
const STARLINK_TRAIN = [0, 1, 2, 3, 4, 5].map((index) => ({
  id: `starlink-${index + 1}`,
  name: 'Starlink satellite',
  shortName: index === 0 ? 'Starlink' : '',
  altitudeKm: 550,
  startAngleDeg: 250 + index * 5,
}))

export const REAL_SATELLITES = [
  { id: 'iss', name: 'the International Space Station', shortName: 'ISS', altitudeKm: 420, startAngleDeg: 30 },
  { id: 'tiangong', name: 'the Tiangong station', shortName: 'Tiangong', altitudeKm: 390, startAngleDeg: 200 },
  { id: 'hubble', name: 'the Hubble telescope', shortName: 'Hubble', altitudeKm: 535, startAngleDeg: 110 },
  ...STARLINK_TRAIN,
  { id: 'landsat-9', name: 'Landsat 9', shortName: 'Landsat 9', altitudeKm: 705, startAngleDeg: 320 },
  { id: 'sentinel-2a', name: 'Sentinel-2A', shortName: 'Sentinel-2A', altitudeKm: 786, startAngleDeg: 160 },
  { id: 'noaa-20', name: 'the NOAA-20 weather satellite', shortName: 'NOAA-20', altitudeKm: 824, startAngleDeg: 60 },
]
