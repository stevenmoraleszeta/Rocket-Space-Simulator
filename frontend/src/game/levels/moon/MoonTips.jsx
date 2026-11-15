/**
 * Small tutorial cards for the Moon level, one set per step (base, aim, lunar orbit).
 * Each card is one big animation and one short line, with Skip and "Don't show again".
 * The "?" button in the corner of the map opens the cards for the current step any time.
 * While a card is open the level plays calm music (MoonLaunchLevel useSoundtrack).
 */
import { useEffect, useRef, useState } from 'react'
import { SYNTH, playSynth } from '../../../audio'
import { tipsTurnedOff, turnTipsOff } from './moonTipsStorage.js'

const ART = {
  pin: (
    <div className="moon-tut-art moon-tut-art--pin" aria-hidden="true">
      <span className="moon-tut-globe">🌍</span>
      <span className="moon-tut-pin">📍</span>
    </div>
  ),
  orbit: (
    <div className="moon-tut-art moon-tut-art--orbit" aria-hidden="true">
      <span className="moon-tut-earth">🌍</span>
      <span className="moon-tut-orbit"><span className="moon-tut-moon">🌕</span></span>
    </div>
  ),
  light: (
    <div className="moon-tut-art moon-tut-art--light" aria-hidden="true">
      <span className="moon-tut-sun">☀️</span>
      <span className="moon-tut-rays" />
      <span className="moon-tut-cycle"><span>🌑</span><span>🌒</span><span>🌓</span><span>🌔</span><span className="is-best">🌕</span></span>
    </div>
  ),
  swing: (
    <div className="moon-tut-art moon-tut-art--swing" aria-hidden="true">
      <span className="moon-tut-swing-earth">🌍</span>
      <span className="moon-tut-swing-out" />
      <span className="moon-tut-swing-home" />
      <span className="moon-tut-swing-moon">🌕</span>
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
      <span>🌍</span>
      <span className="moon-tut-eight">∞</span>
      <span>🌕</span>
    </div>
  ),
  drag: (
    <div className="moon-tut-art moon-tut-art--drag" aria-hidden="true">
      <span className="moon-tut-base" />
      <span className="moon-tut-dots" />
      <span className="moon-tut-hand">👆</span>
    </div>
  ),
  traffic: (
    <div className="moon-tut-art moon-tut-art--traffic" aria-hidden="true">
      <span className="moon-tut-sat">🛰️</span>
      <span className="moon-tut-junk">✦ · ✧ · ✦</span>
      <span className="moon-tut-rocket">🚀</span>
    </div>
  ),
  event: (
    <div className="moon-tut-art moon-tut-art--event" aria-hidden="true">
      <span className="moon-tut-moon-big">🌕</span>
      <span className="moon-tut-alert">⚡</span>
    </div>
  ),
}

const MOON_TIPS = {
  site: [
    { art: 'pin', title: 'Pick a base', text: 'Tap a pin, then press Accept.' },
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
