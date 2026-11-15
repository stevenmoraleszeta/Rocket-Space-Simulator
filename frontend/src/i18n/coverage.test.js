/**
 * Every player-facing English sentence passed to t() must have a Spanish line.
 * Dynamic template strings (with ${}) are listed too: they cannot be dictionary keys.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { es } from './es.js'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'i18n' || name === 'node_modules' || name === 'assets') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.(js|jsx)$/.test(name) && !name.endsWith('.test.js')) out.push(path)
  }
  return out
}

function scan(source) {
  const keys = []
  const dynamic = []
  const call = /\bt\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g
  let match = call.exec(source)
  while (match) {
    const raw = match[2]
    if (match[1] === '`' && raw.includes('${')) dynamic.push(raw)
    else keys.push(raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n'))
    match = call.exec(source)
  }
  const jsx = />([A-Za-z][^<{]{2,})</g
  const leftover = []
  let text = jsx.exec(source)
  while (text) {
    const line = text[1].replace(/\s+/g, ' ').trim()
    if (/[A-Za-z]{3,}/.test(line) && !/^https?:/.test(line)) leftover.push(line)
    text = jsx.exec(source)
  }
  return { keys, dynamic, leftover }
}

test('every t() sentence has a Spanish translation', () => {
  const missing = []
  const dynamic = []
  const leftover = []
  for (const file of walk(SRC)) {
    const source = readFileSync(file, 'utf8')
    const found = scan(source)
    const where = relative(SRC, file)
    for (const key of found.keys) {
      const spanish = es[key]
      if (typeof spanish !== 'string' || spanish.trim() === '') missing.push(`${where}: ${key}`)
    }
    for (const raw of found.dynamic) dynamic.push(`${where}: ${raw}`)
    for (const line of found.leftover) leftover.push(`${where}: ${line}`)
  }
  assert.deepEqual(dynamic, [], `dynamic t() calls cannot be translated:\n${dynamic.join('\n')}`)
  assert.deepEqual(missing, [], `missing Spanish:\n${missing.join('\n')}`)
  assert.deepEqual(leftover, [], `English still in the screen:\n${leftover.join('\n')}`)
})
