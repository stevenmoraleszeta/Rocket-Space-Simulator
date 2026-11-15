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
import launchBaseUrl from '../../assets/images/rockets/launch_base.png'
import explosionSheetUrl from '../../assets/images/rockets/animations/explosion_sheet.png'
import earthPlanetUrl from '../../assets/images/planets/earth.svg'
import spaceBackgroundUrl from '../../assets/images/backgrounds/space.svg'
import satelliteSheetUrl from '../../assets/images/satellites/satellite_sheet.png'

export const ASSETS = Object.freeze({
  // Rocket waiting on the pad: engine off (cold nozzle), like in the hangar before liftoff.
  rocketIdle: { src: rocketOffUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  // Rocket with the engine burning (flight).
  rocketLit: { src: rocketLitUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  launchBase: { src: launchBaseUrl, frameWidth: 48, frameHeight: 24, frames: 1 },
  // 8 frames of 32 x 32 in the first row.
  explosion: { src: explosionSheetUrl, frameWidth: 32, frameHeight: 32, frames: 8 },
  earthPlanet: { src: earthPlanetUrl, frameWidth: 256, frameHeight: 256, frames: 1 },
  spaceBackground: { src: spaceBackgroundUrl, frameWidth: 320, frameHeight: 180, frames: 1 },
  // Real satellites on the orbit map: gold body, solar panels with a sun glint and a blinking light.
  satellite: { src: satelliteSheetUrl, frameWidth: 24, frameHeight: 16, frames: 4 },
})
