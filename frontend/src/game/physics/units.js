/**
 * UNIT CONVERSIONS between physical units and screen units.
 *
 * Physics always works in meters. Pixels only exist when drawing:
 *   pixels = kilometers × pixelsPerKilometer
 * pixelsPerKilometer is NOT a constant: each view (camera) picks its own scale.
 */
import { METERS_PER_KILOMETER } from './constants.js'

export const metersToKilometers = (meters) => meters / METERS_PER_KILOMETER
export const kilometersToMeters = (kilometers) => kilometers * METERS_PER_KILOMETER

export const kilometersToPixels = (kilometers, pixelsPerKilometer) => kilometers * pixelsPerKilometer
export const pixelsToKilometers = (pixels, pixelsPerKilometer) => pixels / pixelsPerKilometer

export const metersToPixels = (meters, pixelsPerKilometer) => metersToKilometers(meters) * pixelsPerKilometer
export const pixelsToMeters = (pixels, pixelsPerKilometer) => kilometersToMeters(pixels / pixelsPerKilometer)
