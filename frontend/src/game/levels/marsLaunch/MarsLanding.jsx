/**
 * After reaching Mars: the recon dome comes down slowly under its parachute, fires its braking
 * rockets and touches the red ground (marsLandingScene.js). While it comes down, short captions
 * say why exploring Mars matters; on touchdown, that one day people may live there.
 * It waits for "Continue" so there is time to read. "Skip" ends it at once; with reduced motion
 * it shows the dome already on the ground.
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

/** Why we explore Mars, one short line at a time while the dome comes down. */
const WHY_MARS = [
  'Why explore Mars? It is the planet most like Earth: its days last almost 24 hours, and it has seasons and ice.',
  'Long ago Mars had rivers and lakes. Its rocks can tell us if life ever began there.',
  'The recon dome studies the ground, the air, the ice and the dangers, like dust storms and radiation.',
]
const LIVE_THERE = 'With what we learn, in some years people may be able to live on Mars!'

export function MarsLanding({ onDone }) {
  const canvasRef = useRef(null)
  const [landed, setLanded] = useState(false)
  const [line, setLine] = useState(0)
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
    const start = performance.now()
    const tick = (now) => {
      const seconds = (now - start) / 1000
      drawLandingFrame(image, scene, Math.min(seconds, LANDING_SECONDS))
      ctx.putImageData(image, 0, 0)
      setLine(Math.min(WHY_MARS.length - 1, Math.floor((seconds / TOUCHDOWN) * WHY_MARS.length)))
      if (seconds >= TOUCHDOWN) setLanded(true)
      // After the dust settles the scene stays, waiting for "Continue".
      if (seconds >= LANDING_SECONDS) return
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
      <p className={`mars-landing__why${landed ? ' is-landed' : ''}`} key={landed ? 'live' : line} aria-live="polite">
        {landed ? t(LIVE_THERE) : t(WHY_MARS[line])}
      </p>
      <button
        type="button"
        className={`${landed ? 'ms-btn' : 'game__back'} mars-landing__skip`}
        onClick={() => doneRef.current()}
      >
        {landed ? t('Continue') : t('Skip')}
      </button>
    </div>
  )
}
