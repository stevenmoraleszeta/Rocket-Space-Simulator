/**
 * A history scene shown after winning a mission (FirstOrbitStory.jsx, MoonLandingStory.jsx):
 * a pixel astronaut floats in, waves and tells a short true story, letter by letter, over a
 * pixel replay of that real flight. A mission clock sits in the top-left corner. When the last
 * line is read an "Onward!" button appears.
 *
 * Props:
 *   lines     English sentences (translated with t()), read one after another
 *   replay    the animated background (a canvas component)
 *   clock     { ship, phase, detail }: the three lines of the mission clock, already translated
 *   onDone    called by the "Onward!" button
 */
import { useEffect, useRef, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { SYNTH, playSynth } from '../../../audio'
import { ASSETS } from '../../rendering/assetManifest.js'
import { reducedMotion } from './reducedMotion.js'
import './firstOrbitStory.css'

/* ---------- Pixel astronaut (SVG layers, like Laika in PadLaika.jsx) ---------- */

const SUIT = '#f2f4f8'
const SUIT_SHADE = '#c6cedc'
const VISOR = '#1d2a52'
const SKIN = '#f1c27d'
const INK = '#1a1a2a'
const GLOVE = '#e8663a'
const BOOT = '#3b4256'

/** 24×30 astronaut. Each rect is [x, y, w, h, color]. */
const ART = { width: 24, height: 30 }
const BODY = [
  // legs and boots
  [7, 22, 4, 6, SUIT], [13, 22, 4, 6, SUIT], [10, 22, 1, 6, SUIT_SHADE], [16, 22, 1, 6, SUIT_SHADE],
  [6, 28, 5, 2, BOOT], [13, 28, 5, 2, BOOT],
  // torso, chest panel and belt
  [6, 12, 12, 10, SUIT], [16, 12, 2, 10, SUIT_SHADE],
  [9, 14, 6, 4, '#3a5bd9'], [10, 15, 1, 1, '#ff5d73'], [12, 15, 1, 1, '#ffd23f'], [13, 16, 1, 1, '#3ddc97'],
  [6, 21, 12, 1, '#8a93a6'],
  // helmet with the face behind the visor
  [8, 0, 8, 1, SUIT], [6, 1, 12, 1, SUIT], [5, 2, 14, 8, SUIT], [6, 10, 12, 1, SUIT], [7, 11, 10, 1, SUIT_SHADE],
  [17, 2, 2, 8, SUIT_SHADE],
  [7, 3, 10, 6, VISOR], [8, 4, 8, 5, SKIN],
  [10, 5, 1, 1, INK], [13, 5, 1, 1, INK],
  [9, 7, 1, 1, '#f29a9a'], [14, 7, 1, 1, '#f29a9a'],
  [15, 3, 1, 2, '#ffffff'],
]
const MOUTH_SMILE = [[11, 7, 2, 1, INK]]
const MOUTH_OPEN = [[11, 7, 2, 2, '#8a2a3a']]
/** Arm on the viewer's left, hanging; it swings forward while he explains. */
const ARM_LEFT = [[3, 13, 3, 8, SUIT], [3, 13, 1, 8, SUIT_SHADE], [3, 21, 3, 2, GLOVE]]
/** Arm on the viewer's right, raised high to wave. */
const ARM_RIGHT = [[18, 11, 3, 3, SUIT], [19, 5, 3, 7, SUIT], [21, 5, 1, 7, SUIT_SHADE], [19, 2, 3, 3, GLOVE]]

function Layer({ rects, className, origin }) {
  const left = Math.min(...rects.map(([x]) => x))
  const top = Math.min(...rects.map(([, y]) => y))
  const right = Math.max(...rects.map(([x, , w]) => x + w))
  const bottom = Math.max(...rects.map(([, y, , h]) => y + h))
  const ox = ((left + (right - left) * origin[0]) * 100) / ART.width
  const oy = ((top + (bottom - top) * origin[1]) * 100) / ART.height
  return (
    <svg
      className={`fo-astro__part ${className}`}
      viewBox={`0 0 ${ART.width} ${ART.height}`}
      shapeRendering="crispEdges"
      style={{ transformOrigin: `${ox}% ${oy}%` }}
      aria-hidden="true"
    >
      {rects.map(([x, y, w, h, fill], index) => <rect key={index} x={x} y={y} width={w} height={h} fill={fill} />)}
    </svg>
  )
}

export function Astronaut({ talking }) {
  return (
    <div className={`fo-astro${talking ? ' is-talking' : ''}`} aria-hidden="true">
      <div className="fo-astro__float">
        <Layer rects={ARM_LEFT} className="fo-astro__arm-left" origin={[0.5, 0]} />
        <Layer rects={BODY} className="fo-astro__body" origin={[0.5, 1]} />
        <Layer rects={MOUTH_SMILE} className="fo-astro__smile" origin={[0.5, 0.5]} />
        <Layer rects={MOUTH_OPEN} className="fo-astro__talk" origin={[0.5, 0.5]} />
        <Layer rects={ARM_RIGHT} className="fo-astro__arm-right" origin={[0, 1]} />
      </div>
    </div>
  )
}

/* ---------- The scene ---------- */

export function PixelStory({ lines, replay, clock, onDone }) {
  const [line, setLine] = useState(0)
  const [shown, setShown] = useState(() => (reducedMotion() ? Infinity : 0))
  const doneRef = useRef(null)
  const text = t(lines[line])
  const typing = shown < text.length
  const last = line === lines.length - 1

  // Typewriter: one letter at a time
  useEffect(() => {
    if (!typing) return undefined
    const timer = setTimeout(() => setShown((count) => count + 1), 32)
    return () => clearTimeout(timer)
  }, [typing, shown])

  // Read on by itself after a pause; the player can also tap to go faster
  useEffect(() => {
    if (typing || last) return undefined
    const timer = setTimeout(() => {
      setLine((value) => value + 1)
      setShown(reducedMotion() ? Infinity : 0)
    }, 2600)
    return () => clearTimeout(timer)
  }, [typing, last, line])

  useEffect(() => {
    if (!typing && last) doneRef.current?.focus()
  }, [typing, last])

  useEffect(() => {
    playSynth(SYNTH.sparkle)
  }, [])

  function next() {
    if (typing) {
      setShown(Infinity)
      return
    }
    if (last) return
    setLine((value) => value + 1)
    setShown(reducedMotion() ? Infinity : 0)
  }

  return (
    <div
      className="first-orbit"
      style={{ backgroundImage: `url(${ASSETS.spaceBackground.src})` }}
      role="dialog" aria-modal="true" aria-labelledby="first-orbit-title">
      {replay}

      <div className="first-orbit__clock" aria-hidden="true">
        <p className="first-orbit__ship">{clock.ship}</p>
        <p className="first-orbit__phase">{clock.phase}</p>
        <p className="first-orbit__minute">{clock.detail}</p>
      </div>

      <div className="first-orbit__stage">
        <Astronaut talking={typing} />
        <section className="first-orbit__talk" onClick={next}>
          <p id="first-orbit-title" className="first-orbit__who">{t('Astronaut')}</p>
          <p className="first-orbit__text" aria-live="polite">
            {text.slice(0, shown)}
            <span className="first-orbit__ghost" aria-hidden="true">{text.slice(shown)}</span>
          </p>
          <div className="first-orbit__foot">
            <span className="first-orbit__dots" aria-hidden="true">
              {lines.map((item, index) => <span key={item} className={index <= line ? 'is-on' : ''} />)}
            </span>
            {!last && !typing && <span className="first-orbit__more" aria-hidden="true">▼</span>}
            {last && !typing && (
              <button
                ref={doneRef}
                type="button"
                className="ms-btn first-orbit__go"
                onClick={(event) => {
                  event.stopPropagation()
                  onDone()
                }}
              >
                {t('Onward!')}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
