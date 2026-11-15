/**
 * "Did you know?" cards that pop in by surprise while the player builds or aims.
 * One every little while, never twice in a row, and the player can close it.
 */
import { useEffect, useState } from 'react'
import { SYNTH, playSynth } from '../audio'
import { t } from '../i18n/index.js'
import './funFacts.css'

const FUN_FACTS = [
  { icon: '🐕', text: 'Laika was the first animal to orbit Earth, in 1957, on Sputnik 2.' },
  { icon: '👣', text: 'The footprints left on the Moon in 1969 are still there. There is no wind to blow them away.' },
  { icon: '🌙', text: 'The Moon drifts about 3.8 cm farther from Earth every year, about as fast as your nails grow.' },
  { icon: '🌗', text: 'We always see the same side of the Moon. It turns once for every trip around Earth.' },
  { icon: '🚀', text: 'A Saturn V rocket burned about 15 tonnes of fuel every second at liftoff.' },
  { icon: '🛰️', text: 'The ISS goes around Earth every 90 minutes. Its crew sees 16 sunrises a day.' },
  { icon: '🧊', text: 'Some craters near the Moon’s south pole have not seen sunlight for billions of years. They hold ice.' },
  { icon: '🌡️', text: 'The Moon’s ground can reach 120 °C in the day and −130 °C at night.' },
  { icon: '⚖️', text: 'On the Moon you weigh about one sixth of what you weigh on Earth.' },
  { icon: '🗑️', text: 'More than 30,000 pieces of space junk big enough to track fly around Earth.' },
  { icon: '📡', text: 'Radio takes about 1.3 seconds to reach the Moon, and 1.3 seconds to come back.' },
  { icon: '🐢', text: 'In 1968 two tortoises flew around the Moon on the Soviet Zond 5, and came home safely.' },
  { icon: '🎾', text: 'Alan Shepard hit two golf balls on the Moon during Apollo 14 in 1971.' },
  { icon: '👩‍🚀', text: 'Valentina Tereshkova was the first woman in space, in 1963. She flew alone for almost 3 days.' },
  { icon: '🌍', text: 'From the Moon, Earth looks about 4 times wider than the Moon looks from Earth.' },
  { icon: '🔭', text: 'Hubble flies 535 km up and has taken more than 1.5 million pictures of space.' },
  { icon: '🪨', text: 'Apollo astronauts brought home 382 kg of Moon rocks and dust.' },
  { icon: '🌌', text: 'There is no sound in space: there is no air to carry it.' },
]

const FIRST_DELAY_MS = 7_000
const EVERY_MS = 20_000
const SHOW_MS = 10_000

export function FunFactToast({ facts = FUN_FACTS, paused = false }) {
  const [fact, setFact] = useState(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (paused) return undefined
    const timer = setTimeout(() => {
      setFact((previous) => {
        let next = facts[Math.floor(Math.random() * facts.length)]
        if (next === previous && facts.length > 1) next = facts[(facts.indexOf(next) + 1) % facts.length]
        return next
      })
      setCount((value) => value + 1)
      playSynth(SYNTH.chime)
    }, count === 0 ? FIRST_DELAY_MS : EVERY_MS)
    return () => clearTimeout(timer)
  }, [count, facts, paused])

  useEffect(() => {
    if (!fact) return undefined
    const timer = setTimeout(() => setFact(null), SHOW_MS)
    return () => clearTimeout(timer)
  }, [fact])

  if (!fact) return null
  return (
    <aside className="fun-fact" role="status" key={count}>
      <span className="fun-fact__icon" aria-hidden="true">{fact.icon}</span>
      <div>
        <p className="fun-fact__label">{t('Did you know?')}</p>
        <p className="fun-fact__text">{t(fact.text)}</p>
      </div>
      <button type="button" className="fun-fact__close" aria-label={t('Close')} onClick={() => setFact(null)}>✕</button>
      <span className="fun-fact__timer" aria-hidden="true" style={{ animationDuration: `${SHOW_MS}ms` }} />
    </aside>
  )
}
