/**
 * The Tutorial guide: no words, only a pixel hand, a bouncing arrow and a glowing frame.
 *
 *   <TutorialGuide target="[data-tutorial='part-shield']" />           a hand that taps a button
 *   <TutorialGuide drag={{ from: {x, y}, to: {x, y} }} />               a hand that drags (page pixels)
 *   <TutorialGuide marks={["[data-tutorial-key]"]} />                  small stars on the important things
 *   <TutorialGuide slide={{ target: '#slider' }} />                    a hand sliding along a slider
 *   <TutorialGuide slide={{ target: '.field', swing: true }} />        a hand going left and right
 *   <TutorialGuide target=".panel" hand={false} />                     only a frame and an arrow: "look here"
 *
 * It never blocks clicks (pointer-events: none) and follows the target when the screen moves.
 * Also exports TutorialButton, the small optional "Tutorial" switch.
 */
import { useEffect, useState } from 'react'
import { t } from '../../i18n/index.js'
import './tutorial.css'

/** Pixel hand pointing up with the index finger: rows of 12 columns ('#' outline, 'o' skin). */
const HAND = [
  '....##......',
  '...#oo#.....',
  '...#oo#.....',
  '...#oo#.....',
  '...#oo###...',
  '...#oo#oo##.',
  '.###oo#oo#o#',
  '#oo#oooooooo#',
  '#ooooooooooo#',
  '.#oooooooooo#',
  '.#ooooooooo#.',
  '..#oooooooo#.',
  '..#ooooooo#..',
  '...#######...',
]

export function PixelHand({ className = '' }) {
  const cells = []
  HAND.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#1a1230" />)
      else if (row[x] === 'o') cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#ffe0bd" />)
    }
  })
  return (
    <svg className={`tut-hand ${className}`} viewBox="0 0 13 14" shapeRendering="crispEdges" aria-hidden="true">
      {cells}
    </svg>
  )
}

/** Pixel arrow pointing down. */
function PixelArrow({ className = '' }) {
  return (
    <svg className={`tut-arrow ${className}`} viewBox="0 0 9 10" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M3 0h3v5h3v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h3z" fill="#1a1230" />
      <path d="M4 1h1v5h2v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h2z" fill="#ffd64a" />
    </svg>
  )
}

/** The target's box on the page, measured again every frame (layouts and dialogs move). */
function useTargetBox(selector) {
  const [box, setBox] = useState(null)
  useEffect(() => {
    if (!selector) {
      setBox(null)
      return undefined
    }
    let frame = 0
    let last = ''
    const measure = () => {
      const element = document.querySelector(selector)
      const rect = element?.getBoundingClientRect()
      const next = rect && rect.width > 0 ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null
      const key = next ? `${Math.round(next.left)},${Math.round(next.top)},${Math.round(next.width)},${Math.round(next.height)}` : ''
      if (key !== last) {
        last = key
        setBox(next)
      }
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [selector])
  return box
}

/** Small stars on the important things, so a player sees at once what the trip needs. */
function Marks({ selectors }) {
  const [boxes, setBoxes] = useState([])
  const joined = selectors.join(',')
  useEffect(() => {
    if (!joined) {
      setBoxes([])
      return undefined
    }
    let frame = 0
    let last = ''
    const measure = () => {
      const next = [...document.querySelectorAll(joined)]
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0)
        .map((rect) => ({ left: rect.right, top: rect.top }))
      const key = next.map((b) => `${Math.round(b.left)},${Math.round(b.top)}`).join('|')
      if (key !== last) {
        last = key
        setBoxes(next)
      }
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [joined])
  return boxes.map((box, index) => (
    <span key={index} className="tut-star" style={{ left: box.left, top: box.top }} aria-hidden="true">
      ★
    </span>
  ))
}

export function TutorialGuide({ target = null, drag = null, slide = null, marks = [], hand = true }) {
  const box = useTargetBox(target)
  const slideBox = useTargetBox(slide?.target ?? null)
  let pointer = null
  if (box) {
    const x = box.left + box.width / 2
    // Near the top of the screen the arrow comes from below, otherwise from above
    const fromBelow = box.top < 90
    pointer = (
      <>
        <span
          className="tut-ring"
          style={{ left: box.left - 6, top: box.top - 6, width: box.width + 12, height: box.height + 12 }}
        />
        <span className={`tut-arrow-wrap${fromBelow ? ' is-below' : ''}`} style={{ left: x, top: fromBelow ? box.top + box.height + 6 : box.top - 6 }}>
          <PixelArrow />
        </span>
        {hand && (
          <span className="tut-tap" style={{ left: x, top: box.top + box.height * 0.6 }}>
            <PixelHand />
          </span>
        )}
      </>
    )
  }
  let slider = null
  if (slide && slideBox) {
    const y = slideBox.top + slideBox.height / 2
    const from = { x: slideBox.left + slideBox.width * 0.25, y: slide.swing ? slideBox.top + slideBox.height * 0.8 : y }
    const dx = slideBox.width * 0.5
    slider = (
      <>
        {!slide.swing && (
          <span
            className="tut-ring"
            style={{ left: slideBox.left - 6, top: slideBox.top - 6, width: slideBox.width + 12, height: slideBox.height + 12 }}
          />
        )}
        <span className="tut-swing-arrows" style={{ left: slideBox.left + slideBox.width / 2, top: from.y - 34 }}>
          ◀ ▶
        </span>
        <span
          className={slide.swing ? 'tut-drag is-swing' : 'tut-drag'}
          style={{ left: from.x, top: from.y, '--tut-dx': `${dx}px`, '--tut-dy': '0px' }}
        >
          <PixelHand />
        </span>
      </>
    )
  }
  let dragger = null
  if (drag) {
    const dx = drag.to.x - drag.from.x
    const dy = drag.to.y - drag.from.y
    const length = Math.hypot(dx, dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    dragger = (
      <>
        <span className="tut-dot" style={{ left: drag.from.x, top: drag.from.y }} />
        <span
          className="tut-path"
          style={{ left: drag.from.x, top: drag.from.y, width: length, transform: `rotate(${angle}deg)` }}
        >
          <span className="tut-path__head" />
        </span>
        <span
          className="tut-drag"
          style={{ left: drag.from.x, top: drag.from.y, '--tut-dx': `${dx}px`, '--tut-dy': `${dy}px` }}
        >
          <PixelHand />
        </span>
      </>
    )
  }
  return (
    <div className="tut-layer" aria-hidden="true">
      <Marks selectors={marks} />
      {pointer}
      {dragger}
      {slider}
    </div>
  )
}

/** The small optional switch. Lit while the tutorial is on. */
export function TutorialButton({ on, onToggle }) {
  return (
    <button
      type="button"
      className={on ? 'tut-btn is-on' : 'tut-btn'}
      aria-pressed={on}
      onClick={() => onToggle(!on)}
    >
      <PixelHand className="tut-btn__hand" />
      <span>{t('Tutorial')}</span>
    </button>
  )
}
