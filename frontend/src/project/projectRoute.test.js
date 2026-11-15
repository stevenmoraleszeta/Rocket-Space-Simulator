import assert from 'node:assert/strict'
import test from 'node:test'
import { isProjectLocation, readProjectLanguage } from './projectRoute.js'

function withLocation(url, run) {
  const parsed = new URL(url)
  const previous = globalThis.window
  globalThis.window = {
    location: {
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
    },
  }
  try {
    return run()
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
}

test('the judge page is English unless the link asks for Spanish', () => {
  assert.equal(readProjectLanguage(), 'en')
  assert.equal(withLocation('http://localhost/project', () => readProjectLanguage()), 'en')
  assert.equal(withLocation('http://localhost/project?lang=en', () => readProjectLanguage()), 'en')
  assert.equal(withLocation('http://localhost/project?lang=es', () => readProjectLanguage()), 'es')
  assert.equal(withLocation('http://localhost/project?lang=fr', () => readProjectLanguage()), 'en')
})

test('the judge page matches /project and #/project, including a trailing slash', () => {
  assert.equal(isProjectLocation(), false)
  assert.equal(withLocation('http://localhost/', () => isProjectLocation()), false)
  assert.equal(withLocation('http://localhost/project', () => isProjectLocation()), true)
  assert.equal(withLocation('http://localhost/project/', () => isProjectLocation()), true)
  assert.equal(withLocation('http://localhost/project?lang=es', () => isProjectLocation()), true)
  assert.equal(withLocation('http://localhost/#/project', () => isProjectLocation()), true)
  assert.equal(withLocation('http://localhost/#/project/', () => isProjectLocation()), true)
  assert.equal(withLocation('http://localhost/#/earth/hangar', () => isProjectLocation()), false)
  assert.equal(withLocation('http://localhost/projects', () => isProjectLocation()), false)
})
