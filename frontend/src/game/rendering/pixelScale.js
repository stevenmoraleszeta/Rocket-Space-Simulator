/** Internal resolution of every pixel-art scene, in art pixels. */
export const STAGE_WIDTH = 320
export const STAGE_HEIGHT = 180

/** Largest integer scale that fits the whole stage inside the given size (never below 1). */
export function computeIntegerScale(availableWidth, availableHeight) {
  const scale = Math.floor(Math.min(availableWidth / STAGE_WIDTH, availableHeight / STAGE_HEIGHT))
  return Math.max(1, scale)
}

/** Smallest integer scale that covers the given size completely (part of the stage may be cropped). */
export function computeCoverScale(availableWidth, availableHeight) {
  const scale = Math.ceil(Math.max(availableWidth / STAGE_WIDTH, availableHeight / STAGE_HEIGHT))
  return Math.max(1, scale)
}

/**
 * Screen offset (in screen pixels) of the stage's top-left corner so that the focus point
 * stays as close to the center as possible without showing anything outside the stage.
 * `focusArtPixel` is a coordinate in art pixels along one axis.
 */
export function computeCoverOffset(availableSize, stageSize, scale, focusArtPixel) {
  const scaledSize = stageSize * scale
  const centeredOffset = availableSize / 2 - focusArtPixel * scale
  const minimumOffset = availableSize - scaledSize
  return Math.round(Math.min(0, Math.max(minimumOffset, centeredOffset)))
}
