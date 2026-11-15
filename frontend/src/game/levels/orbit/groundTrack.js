/**
 * GROUND TRACK — where an orbit passes over the Earth, on the polar map.
 *
 * The flight simulation stays in the orbital plane (real meters). This file only
 * answers "which point on the map is that?" so the drawn path goes through the
 * launch site instead of starting at the rim of the disc.
 *
 * A circular orbit of inclination i (NASA / Vallado):
 *   sin(latitude) = sin(i) · sin(u)
 *   longitude     = Ω + atan2( cos(i)·sin(u), cos(u) )
 * u is the argument of latitude: 0 at the ascending node, growing along the flight.
 *
 * Polar corridors (inclination 80° and up) leave to the south, the way Vandenberg
 * flies over the Pacific, so the pad sits on the descending leg:
 *   u0 = π − arcsin( sin(latitude) / sin(i) )
 * Lower inclinations launch eastward on the ascending leg:
 *   u0 = arcsin( sin(latitude) / sin(i) )
 *
 * The spin boost used by the simulation, ω·R·cos(i), is the same number as the
 * eastward ground speed ω·R·cos(latitude) times sin(azimuth), because
 * sin(azimuth) = cos(i) / cos(latitude).
 */

/** @returns {object|null} null when this site cannot reach the inclination. */
export function launchGroundTrack(site, inclinationDeg) {
  const inclinationRad = (inclinationDeg * Math.PI) / 180
  const latitudeRad = (site.latitudeDeg * Math.PI) / 180
  const longitudeRad = (site.longitudeDeg * Math.PI) / 180
  const sinInclination = Math.sin(inclinationRad)
  if (Math.abs(sinInclination) < 1e-6) return null
  const sinArgument = Math.sin(latitudeRad) / sinInclination
  if (Math.abs(sinArgument) > 1) return null
  const acute = Math.asin(sinArgument)
  const southbound = inclinationDeg >= 80
  const u0 = southbound ? Math.PI - acute : acute
  const nodeRaw = Math.atan2(Math.cos(inclinationRad) * Math.sin(u0), Math.cos(u0))
  return {
    inclinationRad,
    u0,
    nodeRad: longitudeRad - nodeRaw,
    launchTheta: longitudeRad,
    prograde: inclinationDeg <= 90,
  }
}

/** Argument of latitude after traveling `deltaRadians` from the pad in the sim plane. */
export function argumentAtDelta(track, deltaRadians) {
  const delta = Math.atan2(Math.sin(deltaRadians), Math.cos(deltaRadians))
  return track.u0 + (track.prograde ? delta : -delta)
}

/** Latitude and longitude (radians) at argument of latitude u. */
export function geographicAtArgument(track, argument) {
  const latitudeRad = Math.asin(Math.sin(track.inclinationRad) * Math.sin(argument))
  const longitudeRad = Math.atan2(
    Math.cos(track.inclinationRad) * Math.sin(argument),
    Math.cos(argument),
  ) + track.nodeRad
  return { latitudeRad, longitudeRad }
}

/**
 * Polar map: North Pole at the center, South Pole on the rim.
 * Longitude 0° is to the right, 90° east is up. Same placement as the launch sites.
 */
export function geographicToScreen(view, latitudeRad, longitudeRad) {
  const fraction = (Math.PI / 2 - latitudeRad) / Math.PI
  const radius = view.earthRadiusPixels * fraction
  return {
    x: view.centerX + radius * Math.cos(longitudeRad),
    y: view.centerY - radius * Math.sin(longitudeRad),
  }
}

/** Screen point of a sim-plane position (meters), or null when there is no track. */
export function planeToScreen(view, track, x, y) {
  const theta = Math.atan2(y, x)
  const delta = Math.atan2(Math.sin(theta - track.launchTheta), Math.cos(theta - track.launchTheta))
  const argument = argumentAtDelta(track, delta)
  const { latitudeRad, longitudeRad } = geographicAtArgument(track, argument)
  return geographicToScreen(view, latitudeRad, longitudeRad)
}

/** A point a short step downrange, so the rocket still has a heading while it is over the pad. */
export function screenDownrange(view, track, x, y) {
  const theta = Math.atan2(y, x)
  const delta = Math.atan2(Math.sin(theta - track.launchTheta), Math.cos(theta - track.launchTheta))
  const argument = argumentAtDelta(track, delta) + 0.08
  const { latitudeRad, longitudeRad } = geographicAtArgument(track, argument)
  return geographicToScreen(view, latitudeRad, longitudeRad)
}
