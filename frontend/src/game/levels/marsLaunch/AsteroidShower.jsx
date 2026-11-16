/**
 * Asteroid shower on the way to Mars: dodge the falling rocks by moving the rocket left and right.
 * The mouse (or a finger) steers it; the arrow keys and A/D work too. Logic in asteroidShower.js.
 * onEnd({ survived, hits }) when the time is up or every shield is gone.
 */
import { useEffect, useRef, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { SFX, playSfx } from '../../../audio'
import { ASSETS } from '../../rendering/assetManifest.js'
import {
  FIELD_H,
  FIELD_W,
  HIT_PENALTY,
  SHIELDS,
  SHIP,
  SHOWER_SECONDS,
  createShower,
  stepShower,
} from './asteroidShower.js'
import { createShowerSky, drawShowerSky } from './showerSky.js'
import { TutorialGuide } from '../../tutorial/TutorialGuide.jsx'

/** Keyboard steering speed, in field pixels per second. */
const KEY_SPEED = 150

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}

/** With the Tutorial on, a hand swings left and right over the field for the first seconds. */
const TUTORIAL_HINT_MS = 3500

export function AsteroidShower({ onEnd, tutorial = false }) {
  const [hintOn, setHintOn] = useState(tutorial)
  useEffect(() => {
    if (!tutorial) return undefined
    const timer = setTimeout(() => setHintOn(false), TUTORIAL_HINT_MS)
    return () => clearTimeout(timer)
  }, [tutorial])
  const canvasRef = useRef(null)
  const targetRef = useRef(null)
  const keysRef = useRef({ left: false, right: false })
  const endRef = useRef(onEnd)
  const [hud, setHud] = useState({ shields: SHIELDS, left: SHOWER_SECONDS, hit: false })
  useEffect(() => {
    endRef.current = onEnd
  }, [onEnd])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const rock = loadImage(ASSETS.asteroid.src)
    const rocket = loadImage(ASSETS.rocketUpperStage.src)
    const shower = createShower()
    const sky = createShowerSky()
    let frameId = 0
    let last = performance.now()
    let lastHud = 0
    let flashUntil = 0

    const onKey = (event, down) => {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') keysRef.current.left = down
      else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') keysRef.current.right = down
      else return
      event.preventDefault()
    }
    const keyDown = (event) => onKey(event, true)
    const keyUp = (event) => onKey(event, false)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const keys = keysRef.current
      if (keys.left !== keys.right) targetRef.current = shower.shipX + (keys.right ? 1 : -1) * KEY_SPEED * dt * 4
      const hits = stepShower(shower, dt, targetRef.current)
      if (hits) {
        playSfx(SFX.explosion)
        flashUntil = now + 250
      }

      // Starry space with nebulas; the star layers slide down so it feels like flying
      ctx.imageSmoothingEnabled = false
      drawShowerSky(ctx, sky, shower.time, dt, now < flashUntil)
      // Rocks
      for (const r of shower.rocks) {
        const size = r.r * 2 + 2
        if (rock.complete && rock.naturalWidth > 0) {
          const frame = Math.floor(shower.time * 6 + r.spin) % ASSETS.asteroid.frames
          ctx.drawImage(rock, frame * 32, 0, 32, 32, Math.round(r.x - size / 2), Math.round(r.y - size / 2), size, size)
        } else {
          ctx.fillStyle = '#8a7a6a'
          ctx.fillRect(Math.round(r.x - r.r), Math.round(r.y - r.r), r.r * 2, r.r * 2)
        }
      }
      // The rocket, blinking just after a hit
      const blinking = shower.time < shower.graceUntil && Math.floor(shower.time * 12) % 2 === 0
      if (!blinking && rocket.complete && rocket.naturalWidth > 0) {
        const sprite = ASSETS.rocketUpperStage
        const cell = sprite.frameX + (Math.floor(now / 90) % sprite.frames) * sprite.frameWidth
        const size = 18
        ctx.drawImage(rocket, cell, sprite.frameY, sprite.frameWidth, sprite.frameHeight, Math.round(shower.shipX - size / 2), Math.round(SHIP.y - size / 2), size, size)
      }

      if (now - lastHud > 100 || shower.over) {
        lastHud = now
        setHud({ shields: shower.shields, left: Math.max(0, SHOWER_SECONDS - shower.time), hit: now < flashUntil })
      }
      if (shower.over) {
        if (shower.survived) playSfx(SFX.confirm)
        const result = { survived: shower.survived, hits: shower.hits }
        setTimeout(() => endRef.current(result), shower.survived ? 600 : 900)
        return
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [])

  // The mouse or a finger points where the rocket should go.
  const aim = (event) => {
    const box = canvasRef.current.getBoundingClientRect()
    targetRef.current = ((event.clientX - box.left) / box.width) * FIELD_W
  }

  return (
    <div className="mars-shower" role="dialog" aria-modal="true" aria-label={t('Asteroid shower!')}>
      <div className="mars-shower__hud">
        <p className="mars-shower__title">{t('Asteroid shower!')}</p>
        <p className="mars-shower__hint">{t('Move the mouse left and right to dodge the asteroids.')}</p>
        <div className="mars-shower__stats">
          <span className={hud.hit ? 'mars-shower__shields is-hit' : 'mars-shower__shields'} aria-label={t('Shields: {{n}}', { n: hud.shields })}>
            {Array.from({ length: SHIELDS }, (_, i) => (
              <i key={i} className={i < hud.shields ? 'is-on' : ''} aria-hidden="true" />
            ))}
          </span>
          <span className="mars-shower__time">{t('{{seconds}} s left', { seconds: Math.ceil(hud.left) })}</span>
          <span className="mars-shower__penalty">{t('Each hit: −{{points}} points', { points: HIT_PENALTY })}</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="mars-shower__field"
        width={FIELD_W}
        height={FIELD_H}
        onPointerMove={aim}
        onPointerDown={aim}
        aria-label={t('Space with falling asteroids and your rocket at the bottom')}
      />
      {hintOn && <TutorialGuide slide={{ target: '.mars-shower__field', swing: true }} />}
    </div>
  )
}
