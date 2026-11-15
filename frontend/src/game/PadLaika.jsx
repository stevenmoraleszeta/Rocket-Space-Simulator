/**
 * Laika on the launch pad: a little pixel dog who wags her tail and tells her story when tapped.
 * She sits on the pad art's 480×270 grid (like PadFlag), so she stays on the tarmac at any size.
 *
 * History (for players 12+, told gently and truthfully):
 *   Laika was a stray from Moscow. On 3 November 1957 she flew on Sputnik 2 and became the first
 *   animal to orbit Earth. The capsule was never built to come back, and she died during the flight.
 *   What scientists learned helped keep the first astronauts alive. A monument in Moscow honors her.
 */
import { useEffect, useRef, useState } from 'react'
import { SYNTH, playSynth } from '../audio'
import './padLaika.css'

/** Open tarmac left of the crew, clear of the rocket base and the side panels. */
const SPOT = { x: 52, y: 226, width: 34 }

/** 20×14 pixel dog. Each rect is [x, y, w, h, color]. */
const BODY = [
  [4, 6, 11, 5, '#efe6d2'],
  [8, 6, 3, 2, '#8a5a34'],
  [4, 10, 11, 1, '#d6caa9'],
  [5, 11, 2, 3, '#efe6d2'],
  [8, 11, 2, 3, '#d6caa9'],
  [11, 11, 2, 3, '#efe6d2'],
  [13, 11, 2, 3, '#d6caa9'],
  [5, 13, 2, 1, '#5b4a3a'],
  [11, 13, 2, 1, '#5b4a3a'],
]
const HEAD = [
  [13, 2, 6, 6, '#efe6d2'],
  [13, 2, 3, 3, '#8a5a34'],
  [14, 0, 2, 3, '#6a3f22'],
  [17, 0, 2, 3, '#6a3f22'],
  [16, 4, 1, 1, '#1a1410'],
  [18, 5, 2, 1, '#1a1410'],
  [17, 7, 2, 1, '#e8909c'],
  [13, 7, 3, 1, '#d23c3c'],
]
const TAIL = [
  [1, 4, 2, 1, '#efe6d2'],
  [2, 5, 2, 1, '#efe6d2'],
  [3, 6, 2, 1, '#d6caa9'],
]

function Pixels({ rects }) {
  return rects.map(([x, y, w, h, fill], index) => <rect key={index} x={x} y={y} width={w} height={h} fill={fill} />)
}

/** Size of the dog picture in art pixels. */
const ART = { width: 20, height: 14 }

/**
 * One moving part of the dog drawn in its own full-size <svg> layer, turning around a point of
 * its own pixels (origin, 0..1 across the part's box). Moving a whole layer is done by the GPU;
 * moving a <g> inside one picture made the browser redo layout and paint every frame.
 */
function Part({ rects, className, origin }) {
  const left = Math.min(...rects.map(([x]) => x))
  const top = Math.min(...rects.map(([, y]) => y))
  const right = Math.max(...rects.map(([x, , w]) => x + w))
  const bottom = Math.max(...rects.map(([, y, , h]) => y + h))
  const originX = ((left + (right - left) * origin[0]) * 100) / ART.width
  const originY = ((top + (bottom - top) * origin[1]) * 100) / ART.height
  return (
    <svg
      className={`pad-laika__part ${className}`}
      viewBox={`0 0 ${ART.width} ${ART.height}`}
      shapeRendering="crispEdges"
      style={{ transformOrigin: `${originX}% ${originY}%` }}
      aria-hidden="true"
    >
      <Pixels rects={rects} />
    </svg>
  )
}

export function PadLaika({ onTalk, talking }) {
  return (
    <button
      type="button"
      className={`pad-laika${talking ? ' is-talking' : ''}`}
      style={{
        left: `${(SPOT.x * 100) / 480}%`,
        top: `${(SPOT.y * 100) / 270}%`,
        width: `${(SPOT.width * 100) / 480}%`,
      }}
      aria-label="Laika the space dog. Tap to hear her story."
      onClick={() => {
        playSynth(SYNTH.woof)
        onTalk()
      }}
    >
      {!talking && <span className="pad-laika__bubble" aria-hidden="true">!</span>}
      <Part rects={TAIL} className="pad-laika__tail" origin={[1, 1]} />
      <Part rects={BODY} className="pad-laika__body" origin={[0.5, 1]} />
      <Part rects={HEAD} className="pad-laika__head" origin={[0.2, 0.9]} />
    </button>
  )
}

const PAGES = [
  {
    art: '🐕',
    title: 'Woof! I’m Laika.',
    text: 'I was a street dog in Moscow: small, calm, and brave. Scientists picked me because street dogs are used to cold and hunger.',
  },
  {
    art: '🛰️',
    title: '3 November 1957',
    text: 'I flew on Sputnik 2 and became the first animal to go all the way around Earth. A radio sent my heartbeat to the scientists.',
  },
  {
    art: '🌡️',
    title: 'A one-way trip',
    text: 'My capsule was never built to come back, and it got too hot inside. I did not survive. Many people were sad, and it changed how we treat animals in science.',
  },
  {
    art: '👩‍🚀',
    title: 'Why it mattered',
    text: 'What they learned from my flight helped keep the first astronauts alive. Today a statue of me stands in Moscow.',
  },
  {
    art: '🚀',
    title: 'Your turn, engineer!',
    text: 'Pack food, water, air, and a way to slow down. Your crew has to come home safe. Woof!',
  },
]

export function LaikaStory({ onClose }) {
  const [page, setPage] = useState(0)
  const nextRef = useRef(null)
  const last = page === PAGES.length - 1
  const current = PAGES[page]

  useEffect(() => {
    nextRef.current?.focus()
  }, [page])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="laika-shade" onClick={onClose}>
    <section className="laika-talk" role="dialog" aria-modal="true" aria-labelledby="laika-talk-title" onClick={(event) => event.stopPropagation()}>
      <div className="laika-talk__art" aria-hidden="true" key={page}>{current.art}</div>
      <div className="laika-talk__body">
        <p className="laika-talk__who">Laika · the first space dog</p>
        <h2 id="laika-talk-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="laika-talk__foot">
          <span className="laika-talk__dots" aria-hidden="true">
            {PAGES.map((item, index) => <span key={item.title} className={index === page ? 'is-on' : ''} />)}
          </span>
          <button type="button" className="game__back" onClick={onClose}>Close</button>
          {!last && (
            <button
              ref={nextRef}
              type="button"
              className="ms-btn"
              onClick={() => {
                playSynth(SYNTH.whoosh)
                setPage((value) => value + 1)
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </section>
    </div>
  )
}
