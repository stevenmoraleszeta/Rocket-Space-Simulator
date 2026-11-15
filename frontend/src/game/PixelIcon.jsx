/**
 * One place for the small pixel sprites the game shows in place of emojis.
 * Data files name an icon ('rocket', 'boom', 'moon-crescent'...) and screens draw it with
 * <PixelIcon name="..." />. Moon phases are drawn by PixelMoon, so any phase can be shown.
 */
import { PixelMoon } from './levels/moon/PixelMoon.jsx'
import './pixelIcon.css'
import rocket from '../assets/images/rockets/rocket_32x32.png'
import satellite from '../assets/images/satellites/comms_satellite.png'
import telescope from '../assets/images/satellites/space_telescope.png'
import earth from '../assets/images/planets/earth.svg'
import moon from '../assets/images/planets/moon.svg'
import mars from '../assets/images/planets/mars.svg'
import sun from '../assets/images/planets/sun.svg'
import sunBig from '../assets/images/planets/sun_animated.svg'
import asteroid from '../assets/images/asteroids/asteroid.gif'
import money from '../assets/images/icons/budget.svg'
import weight from '../assets/images/icons/mass.svg'
import energy from '../assets/images/icons/energy.svg'
import food from '../assets/images/icons/food.svg'
import fire from '../assets/images/icons/heat.svg'
import target from '../assets/images/icons/arrival_target.svg'
import air from '../assets/images/icons/air.svg'
import bubbles from '../assets/images/icons/bubbles.svg'
import ice from '../assets/images/icons/ice_block.svg'
import warning from '../assets/images/icons/warning.svg'
import gamepad from '../assets/images/icons/gamepad.svg'
import sparkle from '../assets/images/icons/sparkle.svg'
import hand from '../assets/images/icons/hand_pointer.svg'
import pin from '../assets/images/icons/pin.svg'
import junk from '../assets/images/icons/space_junk.svg'
import dog from '../assets/images/icons/dog.svg'
import footprints from '../assets/images/icons/footprints.svg'
import thermometer from '../assets/images/icons/thermometer.svg'
import tortoise from '../assets/images/icons/tortoise.svg'
import golfBall from '../assets/images/icons/golf_ball.svg'
import galaxy from '../assets/images/icons/galaxy.svg'
import spiral from '../assets/images/icons/spiral.svg'
import camera from '../assets/images/icons/camera.svg'
import ringedPlanet from '../assets/images/icons/ringed_planet.svg'
import check from '../assets/images/icons/check.svg'
import boom from '../assets/images/icons/boom.svg'
import arrowUp from '../assets/images/icons/arrow_up.svg'
import arrowDown from '../assets/images/icons/arrow_down.svg'
import fastForward from '../assets/images/icons/fast_forward.svg'
import rewind from '../assets/images/icons/rewind.svg'
import clock from '../assets/images/icons/clock.svg'
import shield from '../assets/images/icons/shield.svg'
import flag from '../assets/images/icons/flag.svg'
import fuelCan from '../assets/images/icons/fuel_can.svg'
import star from '../assets/images/icons/star.svg'
import close from '../assets/images/icons/close.svg'
import astronaut from '../assets/images/items/astronaut.svg'
import antenna from '../assets/images/items/antenna.svg'
import garden from '../assets/images/items/garden.svg'
import lander from '../assets/images/items/lander.svg'
import medicine from '../assets/images/items/medicine.svg'
import parachute from '../assets/images/items/parachute.svg'
import water from '../assets/images/items/water_bottle.svg'
import lock from '../assets/images/items/lock.svg'

export const ICON_URLS = Object.freeze({
  rocket, satellite, telescope, earth, moon, mars, sun, sunBig, asteroid,
  money, weight, energy, food, fire, target, air, bubbles, ice, warning, gamepad, sparkle, hand, pin, junk,
  dog, footprints, thermometer, tortoise, golfBall, galaxy, spiral, camera, ringedPlanet, check, boom,
  arrowUp, arrowDown, fastForward, rewind, clock, shield, flag, fuelCan, star, close,
  astronaut, antenna, garden, lander, medicine, parachute, water, lock,
})

/** Moon phases drawn by PixelMoon (lit fraction, and whether it is growing). */
const MOON_PHASES = {
  'moon-new': { illumination: 0, waxing: true },
  'moon-crescent': { illumination: 0.25, waxing: true },
  'moon-half': { illumination: 0.5, waxing: true },
  'moon-gibbous': { illumination: 0.75, waxing: true },
  'moon-full': { illumination: 1, waxing: true },
  'moon-waning-gibbous': { illumination: 0.75, waxing: false },
  'moon-last-quarter': { illumination: 0.5, waxing: false },
  'moon-waning-crescent': { illumination: 0.25, waxing: false },
  'moon-dark-crescent': { illumination: 0.3, waxing: false },
}

/** A sprite sized like the emoji it replaces: 1em square, so it follows the text size around it. */
export function PixelIcon({ name, className = '' }) {
  const classes = className ? `pixel-icon ${className}` : 'pixel-icon'
  const phase = MOON_PHASES[name]
  if (phase) return <PixelMoon look={phase} className={classes} />
  const src = ICON_URLS[name]
  if (!src) return null
  return <img className={classes} src={src} alt="" draggable="false" />
}
