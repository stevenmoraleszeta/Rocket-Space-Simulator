/**
 * Sentences built with numbers. The English in the game data stays put so the
 * tests keep reading it. Screens call these helpers when they show the line.
 */
import { t } from './index.js'

export function failureMessage(failure) {
  if (!failure) return ''
  if (failure.id === 'fewCrew' && failure.vars) {
    return t('This trip needs {{need}} astronauts, and only {{have}} got on board. Mission control called off the launch.', failure.vars)
  }
  return t(failure.message || '')
}

export function failureHint(failure) {
  if (!failure?.hint) return ''
  return t(failure.hint)
}

export function failureBubble(failure) {
  if (!failure) return ''
  if (failure.id === 'fewCrew' && failure.vars) return t('We need {{need}} astronauts!', failure.vars)
  if (failure.bubble) return t(failure.bubble)
  return ''
}

/** "2 more stars and you become an Orbit Pilot." */
export function rankProgressLine(starsToNext, rankName) {
  const name = t(rankName)
  const article = /^[aeiou]/i.test(rankName) ? 'an' : 'a'
  if (!starsToNext) return t('This is the top title. Every star still shines.')
  if (starsToNext === 1) return t('1 more star and you become {{article}} {{name}}.', { article, name })
  return t('{{count}} more stars and you become {{article}} {{name}}.', { count: starsToNext, article, name })
}
