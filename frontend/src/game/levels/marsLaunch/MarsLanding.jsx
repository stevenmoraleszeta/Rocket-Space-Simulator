/**
 * After reaching Mars: the recon dome comes down slowly under its parachute, fires its braking
 * rockets and touches the red ground (marsLandingScene.js). Meanwhile the player reads, one at a
 * time with "Next", why exploring Mars matters and that one day people may live there. The last
 * message's "Continue" (once the dome is down) opens the mission complete screen, like every
 * level. "Skip" ends it at once; with reduced motion the dome is already on the ground.
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
const MESSAGES = [...WHY_MARS, LIVE_THERE]

export function MarsLanding({ onDone }) {
  const canvasRef = useRef(null)
  const [landed, setLanded] = useState(false)
  const [line, setLine] = useState(0)
  const last = line === MESSAGES.length - 1
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
      <div className={`mars-landing__why${last ? ' is-landed' : ''}`} key={line} aria-live="polite">
        <p className="mars-landing__why-text">{t(MESSAGES[line])}</p>
        <div className="mars-landing__why-row">
          <span className="mars-landing__count">{line + 1} / {MESSAGES.length}</span>
          {last ? (
            <button type="button" className="ms-btn" disabled={!landed} onClick={() => doneRef.current()}>
              {landed ? t('Continue') : t('Landing…')}
            </button>
          ) : (
            <button type="button" className="ms-btn" onClick={() => setLine((current) => current + 1)}>
              {t('Next')} ▶
            </button>
          )}
        </div>
      </div>
      {!last && (
        <button type="button" className="game__back mars-landing__skip" onClick={() => doneRef.current()}>
          {t('Skip')}
        </button>
      )}
    </div>
  )
}
