import assert from 'node:assert/strict'
import test from 'node:test'
import { PROJECT_COPY, PROJECT_LANGUAGES, PROJECT_LINKS } from './copy.js'

function shape(value) {
  if (Array.isArray(value)) return value.map(shape)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape(value[key])]))
  }
  return typeof value
}

function walk(value, visit) {
  if (typeof value === 'string') visit(value)
  else if (Array.isArray(value)) value.forEach((item) => walk(item, visit))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => walk(item, visit))
}

test('English and Spanish describe the same page', () => {
  assert.deepEqual(shape(PROJECT_COPY.en), shape(PROJECT_COPY.es))
  assert.deepEqual(PROJECT_LANGUAGES.map((item) => item.id), ['en', 'es'])
  for (const language of ['en', 'es']) {
    walk(PROJECT_COPY[language], (text) => assert.notEqual(text.trim(), ''))
  }
})

test('the team, the links, and the playable facts stay checkable', () => {
  assert.equal(PROJECT_COPY.en.members.length, 5)
  assert.equal(PROJECT_COPY.en.members[0].name, 'Steven Morales Fallas')
  assert.equal(PROJECT_COPY.en.members.some((member) => member.owner), false)
  assert.deepEqual(PROJECT_COPY.en.rubric.map((item) => item.weight), ['30%', '20%', '20%', '20%', '10%'])
  assert.deepEqual(PROJECT_COPY.en.rubric.map((item) => item.id), ['impact', 'creativity', 'viability', 'prototype', 'presentation'])
  assert.deepEqual(PROJECT_COPY.en.nav.map((item) => item.href), ['#impact', '#creativity', '#viability', '#prototype', '#presentation', '#si'])
  assert.match(JSON.stringify(PROJECT_COPY.en), /Use of Super Intelligence \(SI\)/)
  assert.match(JSON.stringify(PROJECT_COPY.es), /Uso de Superinteligencia \(SI\)/)
  assert.match(JSON.stringify(PROJECT_COPY.en), /Made with AI \(SI\)/)
  assert.match(JSON.stringify(PROJECT_COPY.es), /Hecho con IA \(SI\)/)
  assert.equal(PROJECT_COPY.en.members, PROJECT_COPY.es.members)
  assert.equal(PROJECT_LINKS.play, '/')
  assert.match(PROJECT_LINKS.challenge, /^https:\/\/www\.spaceappschallenge\.org\/2026\/challenges\/junior-astronaut-mission-trainer\/$/)
  assert.match(PROJECT_LINKS.team, /^https:\/\/www\.spaceappschallenge\.org\/2026\/find-a-team\/space-tec\//)

  const english = JSON.stringify(PROJECT_COPY.en)
  const spanish = JSON.stringify(PROJECT_COPY.es)
  assert.match(english, /Become admin/)
  assert.match(english, /Play as player/)
  assert.match(english, /1,080 watts/)
  assert.match(english, /135\.55°/)
  assert.match(spanish, /Modo juez/)
  assert.match(spanish, /Jugar como jugador/)
  assert.match(spanish, /1080 vatios/)
  assert.match(spanish, /135,55°/)
  assert.match(spanish, /Impulsores|impulsores/)
  assert.match(english, /The Black Hole/)
  assert.match(spanish, /El agujero negro/)
  assert.equal(english.includes('White Hole'), false)
  assert.equal(spanish.includes('agujero blanco'), false)
  assert.equal(english.includes('July 1969'), false)
  assert.equal(spanish.includes('julio de 1969'), false)
  assert.equal(english.includes('Horizons'), false)
  assert.equal(spanish.includes('Horizons'), false)
  assert.equal(english.includes('Team owner'), false)
  assert.equal(spanish.includes('Dueño del equipo'), false)
  assert.match(english, /Impact/)
  assert.match(english, /Creativity/)
  assert.match(english, /Viability/)
  assert.match(english, /Prototype and MVP/)
  assert.match(english, /Presentation/)
  assert.match(spanish, /Impacto/)
  assert.match(spanish, /Creatividad/)
  assert.match(spanish, /Viabilidad/)
  assert.match(spanish, /Prototipo y MVP/)
  assert.match(spanish, /Presentación/)
})
