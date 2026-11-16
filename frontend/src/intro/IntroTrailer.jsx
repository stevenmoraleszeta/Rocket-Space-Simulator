/**
 * Intro trailer shown when the game opens. It can be skipped at any moment (button or Esc).
 *
 *   <IntroTrailer onDone={() => showTheMenu()} />
 *
 * Steps:
 *   name   asks the player's name (and the language)
 *   play   the one-minute trailer (TrailerReel.jsx), with music and effects only
 *
 * Typing the name is also the click browsers need before they allow sound.
 * replay: opened again from the menu. A player whose name is already saved goes straight
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
import { markIntroSeen } from './introStore.js'
import { TrailerReel } from './TrailerReel.jsx'
import './intro.css'

export function IntroTrailer({ replay = false, onDone }) {
  const { playerName, language, update } = useSettings()
  const [phase, setPhase] = useState(() => {
    const saved = engineerName(playerName)
    return replay && saved ? 'play' : 'name'
  })
  const [typedName, setTypedName] = useState(playerName)
  const nameId = useId()
  const name = engineerName(typedName)

  useSoundtrack({ music: phase === 'play' ? MUSIC.flight : null, ambient: AMBIENCE.space })

  const close = useCallback(() => {
    markIntroSeen()
    onDone?.()
  }, [onDone])

  const finish = useCallback(() => {
    close()
  }, [close])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  const submitName = (event) => {
    event.preventDefault()
    update({ playerName: name })
    playSfx(SFX.confirm)
    setPhase('play')
  }

  return (
    <div
      className={`intro intro--${phase === 'play' ? 'reel' : 'gate'}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('Game trailer')}
    >
      {phase === 'play' ? (
        <TrailerReel shownName={name} onEnd={close} />
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
