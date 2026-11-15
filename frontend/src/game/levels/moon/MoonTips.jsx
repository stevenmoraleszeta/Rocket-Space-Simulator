/**
 * Small tutorial cards for the Moon level, one set per step (base, aim, lunar orbit).
 * Each card is one big animation and one short line, with Skip and "Don't show again".
 * The "?" button in the corner of the map opens the cards for the current step any time.
 * While a card is open the level plays calm music (MoonLaunchLevel useSoundtrack).
 */
import { useEffect, useRef, useState } from 'react'
import { SYNTH, playSynth } from '../../../audio'
import { tipsTurnedOff, turnTipsOff } from './moonTipsStorage.js'
import { PixelMoon } from './PixelMoon.jsx'
import sunUrl from '../../../assets/images/planets/sun.svg'
import earthUrl from '../../../assets/images/planets/earth.svg'
import moonUrl from '../../../assets/images/planets/moon.svg'
import satelliteUrl from '../../../assets/images/satellites/comms_satellite.png'
import rocketUrl from '../../../assets/images/rockets/rocket_32x32.png'
import handUrl from '../../../assets/images/icons/hand_pointer.svg'
import junkUrl from '../../../assets/images/icons/space_junk.svg'
import pinUrl from '../../../assets/images/icons/pin.svg'

/** Pixel sprite sized like the emoji it replaced (1em), so the tip layouts stay the same. */
function Sprite({ src }) {
  return <img className="moon-tut-sprite" src={src} alt="" draggable="false" />
}

// New Moon to full Moon, as pixel sprites for the "Pick a bright Moon" card.
const PHASES = [0, 0.25, 0.5, 0.75, 1]

const ART = {
  pin: (
    <div className="moon-tut-art moon-tut-art--pin" aria-hidden="true">
      <span className="moon-tut-globe"><Sprite src={earthUrl} /></span>
      <span className="moon-tut-pin"><Sprite src={pinUrl} /></span>
    </div>
  ),
  orbit: (
    <div className="moon-tut-art moon-tut-art--orbit" aria-hidden="true">
      <span className="moon-tut-earth"><Sprite src={earthUrl} /></span>
      <span className="moon-tut-orbit"><span className="moon-tut-moon"><Sprite src={moonUrl} /></span></span>
    </div>
  ),
  light: (
    <div className="moon-tut-art moon-tut-art--light" aria-hidden="true">
      <span className="moon-tut-sun"><Sprite src={sunUrl} /></span>
      <span className="moon-tut-rays" />
      <span className="moon-tut-cycle">
        {PHASES.map((illumination) => (
          <span key={illumination} className={illumination === 1 ? 'is-best' : ''}>
            <PixelMoon look={{ illumination, waxing: true }} />
          </span>
        ))}
      </span>
    </div>
  ),
  swing: (
    <div className="moon-tut-art moon-tut-art--swing" aria-hidden="true">
      <span className="moon-tut-swing-earth"><Sprite src={earthUrl} /></span>
      <span className="moon-tut-swing-out" />
      <span className="moon-tut-swing-home" />
      <span className="moon-tut-swing-moon"><Sprite src={moonUrl} /></span>
    </div>
  ),
  land: (
    <div className="moon-tut-art moon-tut-art--land" aria-hidden="true">
      <span className="moon-tut-lander">🛸</span>
      <span className="moon-tut-ground" />
    </div>
  ),
  home: (
    <div className="moon-tut-art moon-tut-art--home" aria-hidden="true">
      <Sprite src={earthUrl} />
      <span className="moon-tut-eight">∞</span>
      <Sprite src={moonUrl} />
    </div>
  ),
  drag: (
    <div className="moon-tut-art moon-tut-art--drag" aria-hidden="true">
      <span className="moon-tut-base" />
      <span className="moon-tut-dots" />
      <span className="moon-tut-hand"><Sprite src={handUrl} /></span>
    </div>
  ),
  traffic: (
    <div className="moon-tut-art moon-tut-art--traffic" aria-hidden="true">
      <span className="moon-tut-sat"><Sprite src={satelliteUrl} /></span>
      <span className="moon-tut-junk"><Sprite src={junkUrl} /><Sprite src={junkUrl} /><Sprite src={junkUrl} /></span>
      <span className="moon-tut-rocket"><Sprite src={rocketUrl} /></span>
    </div>
  ),
  event: (
    <div className="moon-tut-art moon-tut-art--event" aria-hidden="true">
      <span className="moon-tut-moon-big"><Sprite src={moonUrl} /></span>
      <span className="moon-tut-alert">⚡</span>
    </div>
  ),
}

const MOON_TIPS = {
  site: [
    { art: 'pin', title: 'Pick a base', text: 'Tap a pin, then press Next.' },
  ],
  aim: [
    { art: 'light', title: 'Pick a bright Moon', text: 'The Sun lights half the Moon. Pick a day when the side we see is bright.' },
    { art: 'orbit', title: 'Aim ahead', text: 'The Moon moves. Aim at the yellow ring.' },
    { art: 'drag', title: 'Drag to fly', text: 'Hold your base and drag. Farther = faster.' },
    { art: 'traffic', title: 'Dodge traffic', text: 'Red ✕ means a crash. Change the hour or tap ✨.' },
    { art: 'swing', title: 'Two paths', text: 'Green dots: the way out. Blue dots: the WAY HOME. The Moon’s gravity swings you round, one burn sends you back.' },
  ],
  orbit: [
    { art: 'land', title: 'Land softly', text: 'Hold the engine to slow down. Touch the ground slower than 2.5 m/s.' },
    { art: 'event', title: 'Pick fast!', text: 'Surprises in orbit! Some answers need your hands: tap fast or turn a dial.' },
    { art: 'home', title: 'Then fly home', text: 'Follow the blue dots home and splash down in the sea.' },
  ],
}

export function MoonTips({ step, onClose }) {
  const slides = MOON_TIPS[step] ?? []
  const [index, setIndex] = useState(0)
  const [hideNextTime, setHideNextTime] = useState(tipsTurnedOff)
  const nextRef = useRef(null)
  const slide = slides[index]
  const last = index === slides.length - 1

  useEffect(() => {
    nextRef.current?.focus()
  }, [index])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!slide) return null

  const go = (delta) => {
    playSynth(SYNTH.whoosh)
    setIndex((value) => Math.min(slides.length - 1, value + delta))
  }
  const toggleHide = (event) => {
    setHideNextTime(event.target.checked)
    turnTipsOff(event.target.checked)
  }

  return (
    <section className="moon-tips" role="dialog" aria-modal="false" aria-labelledby="moon-tips-title">
      <div className="moon-tips__card" key={`${step}-${index}`}>
        {ART[slide.art]}
        <div className="moon-tips__copy">
          <h2 id="moon-tips-title">{slide.title}</h2>
          <p className="moon-tips__text">{slide.text}</p>
        </div>
      </div>
      <div className="moon-tips__foot">
        <span className="moon-tips__dots" aria-hidden="true">
          {slides.map((item, dot) => <span key={item.title} className={dot === index ? 'is-on' : ''} />)}
        </span>
        <button
          ref={nextRef}
          type="button"
          className="moon-tips__btn is-main"
          onClick={last ? onClose : () => go(1)}
        >
          {last ? 'Got it!' : 'Next ▶'}
        </button>
        <div className="moon-tips__small">
          {!last && <button type="button" className="moon-tips__skip" onClick={onClose}>Skip</button>}
          <label className="moon-tips__hide">
            <input type="checkbox" checked={hideNextTime} onChange={toggleHide} />
            Don’t show again
          </label>
        </div>
      </div>
    </section>
  )
}
