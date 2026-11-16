/**
 * Intro trailer shown when the game opens. It can be skipped at any moment (button or Esc).
 *
 *   <IntroTrailer onDone={() => showTheMenu()} />
 *
 * Steps:
 *   name   asks the player's name (and the language)
 *   check  the voice says the name and asks "Did I say it right?" (Yes / No)
 *   spell  after a No, the player writes the name the way it sounds, and hears it again
 *   play   the one-minute trailer (TrailerReel.jsx), where the voice calls the player by name
 *
 * Typing the name is also the click browsers need before they allow sound and voice.
 * replay: opened again from the menu. A player whose name is already checked goes straight
 * to the trailer.
 */
import { useCallback, useEffect, useId, useState } from 'react'
import { AMBIENCE, MUSIC, SFX, playSfx, useSoundtrack } from '../audio'
import { AppLogo } from '../brand/AppLogo.jsx'
import { PixelIcon } from '../game/PixelIcon.jsx'
import { LANGUAGES, t } from '../i18n/index.js'
import { BlackHoleBackground } from '../levels/components/BlackHoleBackground.jsx'
import { useSettings } from '../settings/SettingsContext.jsx'
import { MAX_NAME_LENGTH, cleanName, engineerName } from '../settings/settingsStore.js'
import { MAX_SPOKEN_LENGTH, cleanSpoken, markIntroSeen, saveSpokenName, spokenNameFor } from './introStore.js'
import { TrailerReel } from './TrailerReel.jsx'
import { canSpeak, speak, stopSpeaking, warmUpVoice } from './voice.js'
import './intro.css'

// The voice follows the Sounds slider, a little louder so it stays clear over the music.
const VOICE_BOOST = 1.25
const VOICE_BARS = 5

export function IntroTrailer({ replay = false, onDone }) {
  const { playerName, language, ambientVolume, update } = useSettings()
  const voiceVolume = canSpeak() ? Math.min(1, ambientVolume * VOICE_BOOST) : 0
  const hasVoice = voiceVolume > 0
  const [phase, setPhase] = useState(() => {
    const saved = engineerName(playerName)
    return replay && saved && (!hasVoice || spokenNameFor(saved)) ? 'play' : 'name'
  })
  const [typedName, setTypedName] = useState(playerName)
  // What the voice reads for the name: the name itself until the player corrects it.
  const [spoken, setSpoken] = useState(() => {
    const saved = engineerName(playerName)
    return spokenNameFor(saved) || saved
  })
  const [spelling, setSpelling] = useState('')
  const nameId = useId()
  const spellingId = useId()
  const name = engineerName(typedName)

  useSoundtrack({ music: phase === 'play' ? MUSIC.flight : null, ambient: AMBIENCE.space })

  useEffect(() => {
    warmUpVoice()
  }, [])

  // The trailer played to its end: the menu opens while the voice finishes its last words.
  const close = useCallback(() => {
    markIntroSeen()
    onDone?.()
  }, [onDone])

  // Skipped: the voice stops at once.
  const finish = useCallback(() => {
    stopSpeaking()
    close()
  }, [close])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  const say = (text) => speak(text, { language, volume: voiceVolume })
  const sayName = (text) => say(`${t('Engineer {{name}}!', { name: text })} ${t('Did I say it right?')}`)

  const submitName = (event) => {
    event.preventDefault()
    update({ playerName: name })
    playSfx(SFX.confirm)
    const known = spokenNameFor(name)
    if (!name || !hasVoice || known) {
      setSpoken(known || name)
      setPhase('play')
      return
    }
    setSpoken(name)
    setPhase('check')
    sayName(name)
  }

  const confirmName = () => {
    saveSpokenName(name, spoken)
    playSfx(SFX.confirm)
    stopSpeaking()
    setPhase('play')
  }

  const askSpelling = () => {
    playSfx(SFX.cancel)
    setSpelling(spoken)
    setPhase('spell')
    say(t('Write your name the way it sounds.'))
  }

  const submitSpelling = (event) => {
    event.preventDefault()
    const next = cleanSpoken(spelling).trim() || name
    setSpoken(next)
    setPhase('check')
    sayName(next)
  }

  return (
    <div
      className={`intro intro--${phase === 'play' ? 'reel' : 'gate'}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('Game trailer')}
    >
      {phase === 'play' ? (
        <TrailerReel
          shownName={name}
          spokenName={spoken}
          language={language}
          voiceVolume={voiceVolume}
          onEnd={close}
        />
      ) : (
        <BlackHoleBackground>
          <div className="intro-gate">
            <AppLogo size={88} wordmark bare />
            <div className="st-lang intro-gate__lang" role="group" aria-label={t('Language')}>
              {LANGUAGES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`ms-btn${language === item.id ? ' is-on' : ''}`}
                  aria-pressed={language === item.id}
                  onClick={() => update({ language: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {phase === 'name' && (
              <form className="intro-gate__panel" onSubmit={submitName}>
                <label className="intro-gate__ask" htmlFor={nameId}>{t('Your name, engineer?')}</label>
                <input
                  id={nameId}
                  className="st-input intro-gate__input"
                  type="text"
                  autoFocus
                  autoComplete="nickname"
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={t('Type your name')}
                  value={typedName}
                  onChange={(event) => setTypedName(cleanName(event.target.value))}
                />
                <button type="submit" className="ms-btn">{t('Go!')}</button>
              </form>
            )}

            {phase === 'check' && (
              <div className="intro-gate__panel">
                <p className="intro-gate__name">{name}</p>
                <div className="intro-voice" aria-hidden="true">
                  {Array.from({ length: VOICE_BARS }, (_, index) => <span key={index} style={{ '--i': index }} />)}
                </div>
                <p className="intro-gate__ask">{t('Did I say it right?')}</p>
                <div className="intro-gate__row">
                  <button type="button" className="ms-btn ms-btn--icon" autoFocus onClick={confirmName}>
                    <PixelIcon name="check" />
                    {t('Yes')}
                  </button>
                  <button type="button" className="ms-btn ms-btn--icon intro-gate__no" onClick={askSpelling}>
                    <PixelIcon name="close" />
                    {t('No')}
                  </button>
                </div>
                <button type="button" className="ms-btn ms-btn--ghost" onClick={() => sayName(spoken)}>
                  {t('Hear it again')}
                </button>
              </div>
            )}

            {phase === 'spell' && (
              <form className="intro-gate__panel" onSubmit={submitSpelling}>
                <label className="intro-gate__ask" htmlFor={spellingId}>{t('Write it the way it sounds')}</label>
                <input
                  id={spellingId}
                  className="st-input intro-gate__input"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  maxLength={MAX_SPOKEN_LENGTH}
                  value={spelling}
                  onChange={(event) => setSpelling(cleanSpoken(event.target.value))}
                />
                <button type="submit" className="ms-btn">{t('Listen')}</button>
              </form>
            )}
          </div>
        </BlackHoleBackground>
      )}

      <p className="intro__si" role="note">{t('Made with AI (SI)')}</p>
      <button type="button" className="ms-btn ms-btn--ghost ms-btn--icon intro__skip" onClick={finish}>
        {t('Skip')}
        <PixelIcon name="fastForward" />
      </button>
    </div>
  )
}
