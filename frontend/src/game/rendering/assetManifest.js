/**
 * ASSET MANIFEST — the only place where the image paths of our levels are declared.
 *
 * Every entry describes a pixel-art sprite. To swap the art, import the new file here;
 * no scene needs to change.
 *
 * The rocket and the launch base are the same sprites the hangar uses (game/parts.js,
 * GameScreen.jsx), so the rocket looks the same in both screens.
 *
 * Fields:
 *   src          imported image URL
 *   frameWidth   width of one frame, in art pixels
 *   frameHeight  height of one frame, in art pixels
 *   frames       1 = still image; more than 1 = horizontal sprite sheet
 */
import rocketOffUrl from '../../assets/images/rockets/rocket_off_32x32.png'
import rocketLitUrl from '../../assets/images/rockets/rocket_32x32.png'
import rocketSheetUrl from '../../assets/images/rockets/animations/rocket_sheet.png'
import launchBaseUrl from '../../assets/images/rockets/launch_base.png'
import explosionSheetUrl from '../../assets/images/rockets/animations/explosion_sheet.png'
import earthPlanetUrl from '../../assets/images/planets/earth.svg'
import moonPlanetUrl from '../../assets/images/planets/moon.svg'
import marsPlanetUrl from '../../assets/images/planets/mars.svg'
import phobosUrl from '../../assets/images/planets/phobos.svg'
import deimosUrl from '../../assets/images/planets/deimos.svg'
import sunUrl from '../../assets/images/planets/sun.svg'
import asteroidSheetUrl from '../../assets/images/asteroids/asteroid_sheet.png'
import spaceBackgroundUrl from '../../assets/images/backgrounds/space.svg'
import goldSatelliteSheetUrl from '../../assets/images/satellites/gold_satellite_sheet.png'
import commsSatelliteUrl from '../../assets/images/satellites/comms_satellite.png'
import spaceTelescopeUrl from '../../assets/images/satellites/space_telescope.png'
import arrivalTargetUrl from '../../assets/images/icons/arrival_target.svg'

export const ASSETS = Object.freeze({
  // Rocket waiting on the pad: engine off (cold nozzle), like in the hangar before liftoff.
  rocketIdle: { src: rocketOffUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  // Rocket with the engine burning (flight).
  rocketLit: { src: rocketLitUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  // Short upper stage left in space: row 3 (y = 64), cells 6 and 7, after the rear stage drops.
  rocketUpperStage: { src: rocketSheetUrl, frameWidth: 32, frameHeight: 32, frames: 2, frameX: 192, frameY: 64 },
  launchBase: { src: launchBaseUrl, frameWidth: 48, frameHeight: 24, frames: 1 },
  // 8 frames of 32 x 32 in the first row.
  explosion: { src: explosionSheetUrl, frameWidth: 32, frameHeight: 32, frames: 8 },
  earthPlanet: { src: earthPlanetUrl, frameWidth: 256, frameHeight: 256, frames: 1 },
  moonPlanet: { src: moonPlanetUrl, frameWidth: 256, frameHeight: 256, frames: 1 },
  marsPlanet: { src: marsPlanetUrl, frameWidth: 256, frameHeight: 256, frames: 1 },
  phobos: { src: phobosUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  deimos: { src: deimosUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  sun: { src: sunUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  // 8 frames of 32×32. Rocks on the Mars cruise, not a hangar part.
  asteroid: { src: asteroidSheetUrl, frameWidth: 32, frameHeight: 32, frames: 8 },
  spaceBackground: { src: spaceBackgroundUrl, frameWidth: 320, frameHeight: 180, frames: 1 },
  // Satellites circling Earth on the orbit map. Three looks, mixed so neighbors never match.
  // Gold box with solar panels: sun glint and blinking light, 4 frames of 24 x 16 in one row.
  goldSatellite: { src: goldSatelliteSheetUrl, frameWidth: 24, frameHeight: 16, frames: 4 },
  // Communications satellite: dish antenna and long solar wings.
  commsSatellite: { src: commsSatelliteUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  // Space telescope: silver tube with the lid open.
  spaceTelescope: { src: spaceTelescopeUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  // Where the rocket has to arrive on the chosen orbit.
  arrivalTarget: { src: arrivalTargetUrl, frameWidth: 16, frameHeight: 16, frames: 1 },
})
