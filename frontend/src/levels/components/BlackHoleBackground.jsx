/**
 * Background of the start screen: a pixel-art black hole eating matter, based on TON 618.
 *
 * TON 618 is one of the biggest black holes known (about 66 billion Suns). It is a quasar: the
 * gas falling in glows brighter than a whole galaxy and shoots two jets out of the poles.
 * Drawn live at a small size (PIXEL_W × PIXEL_H) and scaled up with smoothing off, so every
 * pixel is a square:
 *   - black shadow and a thin photon ring
 *   - a tilted accretion disk, hot (white) inside to cool (red) outside, spinning faster near the
 *     hole and brighter on the side coming toward us
 *   - the far side of the disk bent over the top of the shadow by gravity
 *   - two violet jets with energy pulses running outward
 *   - particles spiraling in; each one flashes and is gone when it reaches the edge
 *   - an energy flare every few seconds, and twinkling stars
 * With reduced motion it shows one still frame.
 */
import { useEffect, useRef } from 'react'
import { PIXEL_H, PIXEL_W, createScene, drawFrame } from './blackHoleScene.js'

export function BlackHoleBackground({ children }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const image = ctx.createImageData(PIXEL_W, PIXEL_H)
    const scene = createScene()
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let frameId = 0
    let last = performance.now()
    const start = last
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      drawFrame(image, scene, (now - start) / 1000, dt)
      ctx.putImageData(image, 0, 0)
      if (!still) frameId = requestAnimationFrame(tick)
    }
    if (still) {
      // One still frame with the particles already spread around the disk
      for (let i = 0; i < 40; i += 1) drawFrame(image, scene, 2 + i * 0.05, 0.05)
      ctx.putImageData(image, 0, 0)
    } else {
      frameId = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="ms-bg">
      <canvas
        ref={canvasRef}
        className="ms-bg__layer is-pixel bh-canvas"
        width={PIXEL_W}
        height={PIXEL_H}
        role="img"
        aria-label="A giant black hole, like TON 618, pulling in glowing gas and shooting jets of energy"
      />
      <div className="ms-bg__content">{children}</div>
    </div>
  )
}
