/**
 * After reaching Mars: the recon dome comes down slowly under its parachute, fires its braking
 * rockets and touches the red ground (marsLandingScene.js). Then onDone shows the result.
 * "Skip" ends it at once; with reduced motion it shows the dome already on the ground.
 */
import { useEffect, useRef, useState } from 'react'
import { t } from '../../../i18n/index.js'
import {
  LANDING_SECONDS,
  SCENE_H,
  SCENE_W,
  TOUCHDOWN,
  createLandingScene,
  drawLandingFrame,
} from './marsLandingScene.js'

export function MarsLanding({ onDone }) {
  const canvasRef = useRef(null)
  const [landed, setLanded] = useState(false)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const image = ctx.createImageData(SCENE_W, SCENE_H)
    const scene = createLandingScene()
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (still) {
      drawLandingFrame(image, scene, LANDING_SECONDS)
      ctx.putImageData(image, 0, 0)
      const timer = setTimeout(() => setLanded(true), 0)
      return () => clearTimeout(timer)
    }
    let frameId = 0
    let finished = false
    const start = performance.now()
    const tick = (now) => {
      const seconds = (now - start) / 1000
      drawLandingFrame(image, scene, Math.min(seconds, LANDING_SECONDS))
      ctx.putImageData(image, 0, 0)
      if (seconds >= TOUCHDOWN) setLanded(true)
      if (seconds >= LANDING_SECONDS && !finished) {
        finished = true
        doneRef.current()
        return
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="mars-landing" role="dialog" aria-modal="true" aria-label={t('Landing on Mars')}>
      <canvas ref={canvasRef} className="mars-landing__scene" width={SCENE_W} height={SCENE_H} aria-hidden="true" />
      <div className="mars-landing__caption" aria-live="polite">
        <p className="mars-landing__title">{landed ? t('Touchdown!') : t('Landing on Mars')}</p>
        <p className="mars-landing__text">
          {landed ? t('The recon dome is on Mars.') : t('The recon dome is coming down slowly…')}
        </p>
      </div>
      <button type="button" className="game__back mars-landing__skip" onClick={() => doneRef.current()}>
        {landed ? t('Continue') : t('Skip')}
      </button>
    </div>
  )
}
