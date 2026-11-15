/**
 * Laika on the launch pad: a little pixel dog who trots around among the crew, sniffs, sits,
 * scratches, hops, barks and chases her tail, and tells her story when tapped.
 * She lives inside .prep next to PadCrew, so she shares the crew's --scale and ground line and
 * stays in proportion with the engineers (about a third of their height).
 *
 * History (for players 12+, told gently and truthfully):
 *   Laika was a stray from Moscow. On 3 November 1957 she flew on Sputnik 2 and became the first
 *   animal to orbit Earth. The capsule was never built to come back, and she died during the flight.
 *   What scientists learned helped keep the first astronauts alive. A monument in Moscow honors her.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { t } from '../i18n/index.js'
import { SYNTH, playSynth } from '../audio'
import './padLaika.css'
import { PixelIcon } from './PixelIcon.jsx'

/*
 * Real Laika colours: a mostly white mixed-breed dog with light-brown (tan) patches over her
 * eyes and ears, a tan saddle on her back and a white muzzle.
 */
const WHITE = '#f6f3ec'
const SHADE = '#dcd5c6'
const TAN = '#c98c52'
const EAR = '#a46a37'
const INK = '#1a1410'
const PINK = '#e8909c'
const COLLAR = '#d23c3c'
const PAW = '#5b4a3a'

/** 20×14 pixel dog, side view facing right. Each rect is [x, y, w, h, color]. */
const ART = { width: 20, height: 14 }
const TORSO = [
  [4, 6, 11, 5, WHITE],
  [7, 6, 4, 2, TAN],
  [4, 10, 11, 1, SHADE],
]
const LEG_BACK_FAR = [[8, 11, 2, 3, SHADE], [8, 13, 2, 1, PAW]]
const LEG_FRONT_FAR = [[13, 11, 2, 3, SHADE], [13, 13, 2, 1, PAW]]
const LEG_BACK_NEAR = [[5, 11, 2, 3, WHITE], [5, 13, 2, 1, PAW]]
const LEG_FRONT_NEAR = [[11, 11, 2, 3, WHITE], [11, 13, 2, 1, PAW]]
const HEAD = [
  [13, 2, 6, 6, WHITE],
  [14, 2, 3, 4, TAN],
  [14, 0, 2, 3, EAR],
  [17, 0, 2, 3, EAR],
  [16, 4, 1, 1, INK],
  [18, 5, 2, 1, INK],
  [17, 7, 2, 1, PINK],
  [13, 7, 3, 1, COLLAR],
]
const TAIL = [
  [1, 4, 2, 1, WHITE],
  [2, 5, 2, 1, WHITE],
  [3, 6, 2, 1, SHADE],
]

function Pixels({ rects }) {
  return rects.map(([x, y, w, h, fill], index) => <rect key={index} x={x} y={y} width={w} height={h} fill={fill} />)
}

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

/*
 * Where she may walk, in rocket sprite pixels ("u", the --scale unit of .prep, which is 32u wide).
 * x is her left edge; y is how far below the top of the launch platform her paws are.
 * The white platform the crew stands on (the white slab of launch_base.png) spans x -6..39; on each side the
 * concrete apron and grass sit lower, so she hops down off the edge and leaps back up.
 */
const PAD_WIDTH_U = 32
const DOG_WIDTH_U = 20 * 0.34 * 0.62
const LANES = {
  left: { min: -17, max: -6 - DOG_WIDTH_U - 0.5, y: 6 },
  pad: { min: -5.5, max: 39 - DOG_WIDTH_U - 0.3, y: 1.5 },
  right: { min: 40, max: 52, y: 6 },
}
const LANE_ORDER = ['left', 'pad', 'right']
/** Walking and running speed (u per second), and how long one jump takes (ms). */
const WALK_SPEED = 3
const RUN_SPEED = 10
const JUMP_MS = 560
/** Things she does between walks, and how long each one lasts (ms). */
const TRICKS = { sniff: 2600, sit: 3200, scratch: 2200, hop: 1300, bark: 1600, spin: 1500, tilt: 1900 }
const TRICK_NAMES = Object.keys(TRICKS)

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const between = (lo, hi) => lo + Math.random() * (hi - lo)

/**
 * Steps from `from` to x on lane `to`: walk to the platform edge, jump down or up to the next
 * lane, and so on, then walk to x. Each step is { action, x, y, lane, flip, ms }.
 */
function route(from, to, x, speed = WALK_SPEED, action = 'walk') {
  const steps = []
  let at = from
  const walk = (targetX) => {
    if (Math.abs(targetX - at.x) < 0.1) return
    at = { action, x: targetX, y: LANES[at.lane].y, lane: at.lane, flip: targetX < at.x, ms: (Math.abs(targetX - at.x) / speed) * 1000 }
    steps.push(at)
  }
  let index = LANE_ORDER.indexOf(at.lane)
  const goal = LANE_ORDER.indexOf(to)
  while (index !== goal) {
    const step = goal > index ? 1 : -1
    const here = LANES[LANE_ORDER[index]]
    const nextLane = LANE_ORDER[index + step]
    const there = LANES[nextLane]
    walk(step > 0 ? here.max : here.min)
    at = {
      action: there.y > here.y ? 'jump-down' : 'jump-up',
      x: step > 0 ? there.min : there.max,
      y: there.y,
      lane: nextLane,
      flip: step < 0,
      ms: JUMP_MS,
    }
    steps.push(at)
    index += step
  }
  walk(x)
  return steps
}

/** What she does after `now`: mostly a walk somewhere (sometimes off the platform), or a trick. */
function plan(now, view) {
  if (now.action === 'walk' || Math.random() < 0.3) {
    const action = pick(TRICK_NAMES.filter((name) => name !== now.action))
    return [{ ...now, action, ms: TRICKS[action] }]
  }
  // Only the parts of each lane that are on screen (the pad picture is cropped on narrow windows)
  const visible = (name) => ({ min: Math.max(LANES[name].min, view.min), max: Math.min(LANES[name].max, view.max) })
  const sides = ['left', 'right'].filter((name) => visible(name).max - visible(name).min > 1)
  const lane = Math.random() < 0.6 || !sides.length ? 'pad' : pick(sides)
  const { min, max } = visible(lane)
  let x = between(min, max)
  if (lane === now.lane && Math.abs(x - now.x) < 6) x = now.x > (min + max) / 2 ? min : max
  return route(now, lane, x)
}

/** The x range (u, her left edge) that keeps her whole body on screen, with a small margin. */
function visibleRange(track) {
  const pad = track?.parentElement?.getBoundingClientRect()
  if (!pad?.width) return { min: -Infinity, max: Infinity }
  const u = pad.width / PAD_WIDTH_U
  const margin = 12
  return {
    min: (margin - pad.left) / u,
    max: (window.innerWidth - margin - pad.left) / u - DOG_WIDTH_U,
  }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * talking: her story is open, so she stops where she is and listens.
 * launching: the rocket is lifting off, so she runs off the pad.
 */
export function PadLaika({ onTalk, talking, launching = false }) {
  const trackRef = useRef(null)
  const queue = useRef([])
  const [move, setMove] = useState({ action: 'sit', x: 2, y: LANES.pad.y, lane: 'pad', flip: false, ms: TRICKS.sit })

  // Stop on the spot (mid-walk too) while her story is open
  useLayoutEffect(() => {
    if (!talking || !trackRef.current) return
    const track = trackRef.current
    const u = track.offsetWidth / PAD_WIDTH_U
    const { m41, m42 } = new DOMMatrixReadOnly(getComputedStyle(track).transform)
    queue.current = []
    setMove((now) => (u ? { ...now, action: 'sit', x: m41 / u, y: m42 / u, ms: 0 } : { ...now, action: 'sit', ms: 0 }))
  }, [talking])

  // Liftoff: off the platform and away to the left, fast
  useEffect(() => {
    if (!launching) return
    setMove((now) => {
      const steps = [...route(now, 'left', LANES.left.min, RUN_SPEED, 'run'), { action: 'run', x: -70, y: LANES.left.y, lane: 'left', flip: true, ms: 1800 }]
      queue.current = steps.slice(1)
      return steps[0]
    })
  }, [launching])

  useEffect(() => {
    if (talking || (!launching && reducedMotion())) return undefined
    if (launching && !queue.current.length) return undefined
    const timer = setTimeout(() => {
      if (!queue.current.length) queue.current = plan(move, visibleRange(trackRef.current))
      setMove(queue.current.shift())
    }, Math.max(move.ms, 300))
    return () => clearTimeout(timer)
  }, [move, talking, launching])

  const moving = !(move.action in TRICKS) && move.ms > 0
  return (
    <div
      ref={trackRef}
      className="laika-track"
      style={{
        transform: `translate(${(move.x * 100) / PAD_WIDTH_U}%, calc(${move.y} * var(--scale) * 1px))`,
        transition: moving ? `transform ${move.ms}ms linear` : 'none',
        '--move-ms': `${move.ms}ms`,
      }}
    >
      <button
        type="button"
        className={`pad-laika is-${move.action}${move.flip ? ' is-flip' : ''}${talking ? ' is-talking' : ''}`}
        aria-label="Laika the space dog. Tap to hear her story."
        tabIndex={launching ? -1 : 0}
        onClick={() => {
          playSynth(SYNTH.woof)
          onTalk()
        }}
      >
        {!talking && !launching && (
          <span className={`pad-laika__bubble${move.action === 'bark' ? ' is-woof' : ''}`} aria-hidden="true">
            {move.action === 'bark' ? 'Woof!' : '!'}
          </span>
        )}
        <span className="pad-laika__hop">
          <span className="pad-laika__dog">
            <Part rects={TAIL} className="pad-laika__tail" origin={[1, 1]} />
            <Part rects={LEG_BACK_FAR} className="pad-laika__leg pad-laika__leg--b pad-laika__leg--hind" origin={[0.5, 0]} />
            <Part rects={LEG_FRONT_FAR} className="pad-laika__leg pad-laika__leg--a pad-laika__leg--front" origin={[0.5, 0]} />
            <Part rects={TORSO} className="pad-laika__torso" origin={[0, 1]} />
            <Part rects={LEG_BACK_NEAR} className="pad-laika__leg pad-laika__leg--a pad-laika__leg--hind pad-laika__leg--scratch" origin={[0.5, 0]} />
            <Part rects={LEG_FRONT_NEAR} className="pad-laika__leg pad-laika__leg--b pad-laika__leg--front" origin={[0.5, 0]} />
            <Part rects={HEAD} className="pad-laika__head" origin={[0.2, 0.9]} />
          </span>
        </span>
      </button>
    </div>
  )
}

const PAGES = [
  {
    art: 'dog',
    title: 'Woof! I’m Laika.',
    text: 'I was a street dog in Moscow: small, calm, and brave. Scientists picked me because street dogs are used to cold and hunger.',
  },
  {
    art: 'satellite',
    title: '3 November 1957',
    text: 'I flew on Sputnik 2 and became the first animal to go all the way around Earth. A radio sent my heartbeat to the scientists.',
  },
  {
    art: 'thermometer',
    title: 'A one-way trip',
    text: 'My capsule was never built to come back, and it got too hot inside. I did not survive. Many people were sad, and it changed how we treat animals in science.',
  },
  {
    art: 'astronaut',
    title: 'Why it mattered',
    text: 'What they learned from my flight helped keep the first astronauts alive. Today a statue of me stands in Moscow.',
  },
  {
    art: 'rocket',
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
      <div className="laika-talk__art" aria-hidden="true" key={page}><PixelIcon name={current.art} className="laika-talk__sprite" /></div>
      <div className="laika-talk__body">
        <p className="laika-talk__who">{t('Laika · the first space dog')}</p>
        <h2 id="laika-talk-title">{t(current.title)}</h2>
        <p>{t(current.text)}</p>
        <div className="laika-talk__foot">
          <span className="laika-talk__dots" aria-hidden="true">
            {PAGES.map((item, index) => <span key={item.title} className={index === page ? 'is-on' : ''} />)}
          </span>
          <button type="button" className="game__back" onClick={onClose}>{t('Close')}</button>
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
              {t('Next')}
            </button>
          )}
        </div>
      </div>
    </section>
    </div>
  )
}
