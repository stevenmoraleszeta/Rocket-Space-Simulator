/**
 * Pixel-perfect container for pixel-art scenes.
 *
 * Scenes are laid out in a fixed internal resolution (STAGE_WIDTH x STAGE_HEIGHT art pixels)
 * and the whole stage is scaled by an INTEGER factor, so every art pixel keeps the same size
 * and sprites stay sharp.
 *
 * fit="contain"  the whole stage is visible, with empty bands around it if needed.
 * fit="cover"    the stage fills the whole screen behind the UI (like the hangar background).
 *                The parts that do not fit are cropped, keeping `focus` (art pixels) in view.
 */
import { useEffect, useRef, useState } from 'react'
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  computeCoverOffset,
  computeCoverScale,
  computeIntegerScale,
} from './pixelScale.js'
import './pixelStage.css'

const DEFAULT_FOCUS = { x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 }

export function PixelStage({ label, fit = 'contain', focus = DEFAULT_FOCUS, children }) {
  const hostRef = useRef(null)
  const [hostSize, setHostSize] = useState({ width: STAGE_WIDTH, height: STAGE_HEIGHT })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setHostSize({ width, height })
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const isCover = fit === 'cover'
  const scale = isCover
    ? computeCoverScale(hostSize.width, hostSize.height)
    : computeIntegerScale(hostSize.width, hostSize.height)

  const stageStyle = { width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }
  if (isCover) {
    stageStyle.left = computeCoverOffset(hostSize.width, STAGE_WIDTH, scale, focus.x)
    stageStyle.top = computeCoverOffset(hostSize.height, STAGE_HEIGHT, scale, focus.y)
  }

  return (
    <div ref={hostRef} className={isCover ? 'pixel-stage-host pixel-stage-host--cover' : 'pixel-stage-host'}>
      <div className="pixel-stage" role="img" aria-label={label} style={stageStyle}>
        {children}
      </div>
    </div>
  )
}
