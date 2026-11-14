/**
 * ASSET MANIFEST — the only place where Level 0 image paths are declared.
 *
 * Every entry describes a pixel-art sprite. An entry set to `null` is a PLACEHOLDER:
 * the scene draws a temporary shape with CSS until the real art is provided.
 * To plug in new art, import the file here and replace the `null`. No scene needs to change.
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
import launchBaseUrl from '../../assets/images/rockets/launch_base.png'

export const ASSETS = Object.freeze({
  // Rocket waiting on the pad: engine off (cold nozzle), like in the hangar before liftoff.
  rocketIdle: { src: rocketOffUrl, frameWidth: 32, frameHeight: 32, frames: 1 },
  launchBase: { src: launchBaseUrl, frameWidth: 48, frameHeight: 24, frames: 1 },

  // PLACEHOLDER entries: no art provided yet.
  launchTower: null,
  missionControlBuilding: null,
  groundTiles: null,
  skyBackground: null,
})
