/**
 * Small tutorial cards for the Moon level, one set per step (base, aim, lunar orbit), and one
 * for the landing mini-game (MoonLanding.jsx).
 * Each card is one big animation and one short line, with Skip and "Don't show again".
 * The "?" button in the corner of the map opens the cards for the current step any time.
 * While a card is open the level plays calm music (MoonLaunchLevel useSoundtrack).
 */
import { useEffect, useRef, useState } from 'react'
import { t } from '../../../i18n/index.js'
import { SYNTH, playSynth } from '../../../audio'
import { tipsTurnedOff, turnTipsOff } from './moonTipsStorage.js'
import { PixelMoon } from './PixelMoon.jsx'
import { LunarLander } from './LunarLander.jsx'
import sunUrl from '../../../assets/images/planets/sun.svg'
import earthUrl from '../../../assets/images/planets/earth.svg'
import moonUrl from '../../../assets/images/planets/moon.svg'
import satelliteUrl from '../../../assets/images/satellites/comms_satellite.png'
import rocketUrl from '../../../assets/images/rockets/rocket_32x32.png'
import handUrl from '../../../assets/images/icons/hand_pointer.svg'
import junkUrl from '../../../assets/images/icons/space_junk.svg'
import pinUrl from '../../../assets/images/icons/pin.svg'
import energyUrl from '../../../assets/images/icons/energy.svg'

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
  // Landing: the Eagle drops, then its flame comes on and it settles softly
  burn: (
    <div className="moon-tut-art moon-tut-art--burn" aria-hidden="true">
      <span className="moon-tut-eagle"><LunarLander firing /></span>
      <span className="moon-tut-press">{t('SPACE')}</span>
      <span className="moon-tut-ground" />
    </div>
  ),
  // The "Falling" gauge goes from red to yellow to green as the engine slows the Eagle
  gauge: (
    <div className="moon-tut-art moon-tut-art--gauge" aria-hidden="true">
      <span className="moon-tut-gauge">
        <span className="moon-tut-gauge-label">{t('Falling')}</span>
        <span className="moon-tut-gauge-value is-bad">7.0 m/s</span>
        <span className="moon-tut-gauge-value is-warn">4.1 m/s</span>
        <span className="moon-tut-gauge-value is-good">1.8 m/s</span>
      </span>
      <span className="moon-tut-check">✓</span>
    </div>
  ),
  // Short bursts: the fuel bar drops a step at a time while the flame blinks
  fuel: (
    <div className="moon-tut-art moon-tut-art--fuel" aria-hidden="true">
      <span className="moon-tut-eagle moon-tut-eagle--small"><LunarLander firing /></span>
      <span className="moon-tut-fuel"><span /></span>
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
      <span className="moon-tut-alert"><Sprite src={energyUrl} /></span>
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
    { art: 'traffic', title: 'Dodge traffic', text: 'A red X means a crash. Change the hour or tap Help me aim.' },
    { art: 'swing', title: 'Two paths', text: 'Green dots: the way out. Blue dots: the WAY HOME. The Moon’s gravity swings you round, one burn sends you back.' },
  ],
  orbit: [
    { art: 'event', title: 'Surprises in orbit', text: 'Read and pick an answer, there is no rush. Some answers need your hands: tap fast or turn a dial.' },
    { art: 'home', title: 'Then fly home', text: 'Follow the blue dots home and splash down in the sea.' },
  ],
  // Opened by the landing mini-game (MoonLanding.jsx)
  landing: [
    { art: 'burn', title: 'Hold to slow down', text: 'Hold the engine button, the Space bar or the scene. The flame pushes the Eagle up.' },
    { art: 'gauge', title: 'Land on green', text: 'Watch Falling. Touch the ground while it is green: slower than 2.5 m/s.' },
    { art: 'fuel', title: 'Save fuel', text: 'Fuel is short. Fall first, then fire near the ground. Stuck? Tap Autopilot.' },
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
          <h2 id="moon-tips-title">{t(slide.title)}</h2>
          <p className="moon-tips__text">{t(slide.text)}</p>
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
          {last ? t('Got it!') : t('Next ▶')}
        </button>
        <div className="moon-tips__small">
          {!last && <button type="button" className="moon-tips__skip" onClick={onClose}>{t('Skip')}</button>}
          <label className="moon-tips__hide">
            <input type="checkbox" checked={hideNextTime} onChange={toggleHide} />
            {t('Don’t show again')}
          </label>
        </div>
      </div>
    </section>
  )
}
