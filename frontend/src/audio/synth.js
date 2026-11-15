/**
 * Small sounds built in code with WebAudio, for moments that have no recorded file:
 * warnings, radio static, a dog's bark, sparkles. They follow the effects volume slider.
 *
 *   playSynth(SYNTH.warning)
 *
 * Every sound is a short recipe of tones and noise bursts, so nothing has to be downloaded.
 */
import { effectsLoudness } from './audioManager.js'

let context = null

function audio() {
  if (typeof window === 'undefined' || !window.AudioContext) return null
  if (!context) context = new window.AudioContext()
  if (context.state === 'suspended') context.resume().catch(() => {})
  return context
}

/** One beep: wave shape, start and end pitch, length, loudness, delay. */
function tone(ctx, out, { type = 'square', from, to = from, length = 0.15, level = 0.2, at = 0 }) {
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + length)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(level, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.connect(gain)
  gain.connect(out)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

/** A burst of noise through a filter: crackle, static, whoosh, a bark's breath. */
function noise(ctx, out, { length = 0.2, level = 0.2, at = 0, filter = 'bandpass', from = 1200, to = from, q = 1 }) {
  const start = ctx.currentTime + at
  const samples = Math.ceil(ctx.sampleRate * length)
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < samples; i += 1) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const shape = ctx.createBiquadFilter()
  shape.type = filter
  shape.Q.value = q
  shape.frequency.setValueAtTime(from, start)
  shape.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + length)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(level, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  source.connect(shape)
  shape.connect(gain)
  gain.connect(out)
  source.start(start)
  source.stop(start + length + 0.02)
}

export const SYNTH = Object.freeze({
  // Time arrows: a soft clock tick.
  tick: (ctx, out) => tone(ctx, out, { type: 'triangle', from: 1400, to: 900, length: 0.05, level: 0.12 }),
  // A base pin is picked.
  pop: (ctx, out) => tone(ctx, out, { type: 'triangle', from: 380, to: 900, length: 0.12, level: 0.2 }),
  // The dotted line now crosses a satellite or junk.
  warning: (ctx, out) => {
    tone(ctx, out, { from: 880, length: 0.09, level: 0.12 })
    tone(ctx, out, { from: 660, length: 0.12, level: 0.12, at: 0.11 })
  },
  // The path is clean again, or "Help me aim" found one.
  sparkle: (ctx, out) => {
    ;[880, 1175, 1480, 1760].forEach((from, i) => tone(ctx, out, { type: 'sine', from, length: 0.18, level: 0.1, at: i * 0.06 }))
  },
  // Passing through a junk cloud.
  crackle: (ctx, out) => {
    for (let i = 0; i < 7; i += 1) noise(ctx, out, { length: 0.04, level: 0.25, at: i * 0.045 + Math.random() * 0.02, from: 2500 + Math.random() * 2500, q: 4 })
  },
  // Bumping a satellite.
  clang: (ctx, out) => {
    tone(ctx, out, { type: 'square', from: 520, to: 140, length: 0.35, level: 0.18 })
    tone(ctx, out, { type: 'sawtooth', from: 1230, to: 300, length: 0.25, level: 0.08 })
    noise(ctx, out, { length: 0.2, level: 0.15, from: 900, to: 200 })
  },
  // Arriving at the Moon: a rising arpeggio.
  arrive: (ctx, out) => {
    ;[523, 659, 784, 1047, 1319].forEach((from, i) => tone(ctx, out, { type: 'triangle', from, length: 0.3, level: 0.14, at: i * 0.09 }))
  },
  // A fun fact pops in.
  chime: (ctx, out) => {
    tone(ctx, out, { type: 'sine', from: 1318, length: 0.35, level: 0.12 })
    tone(ctx, out, { type: 'sine', from: 1760, length: 0.45, level: 0.1, at: 0.12 })
  },
  // A tutorial card slides.
  whoosh: (ctx, out) => noise(ctx, out, { length: 0.3, level: 0.12, filter: 'bandpass', from: 400, to: 2400, q: 0.8 }),
  // Laika: two short barks.
  woof: (ctx, out) => {
    for (const at of [0, 0.22]) {
      tone(ctx, out, { type: 'sawtooth', from: 420, to: 180, length: 0.14, level: 0.16, at })
      noise(ctx, out, { length: 0.12, level: 0.12, at, from: 900, to: 500, q: 2 })
    }
  },
  // Solar storm.
  alarm: (ctx, out) => {
    for (let i = 0; i < 3; i += 1) tone(ctx, out, { type: 'square', from: 740, to: 990, length: 0.18, level: 0.1, at: i * 0.24 })
  },
  // Behind the Moon: radio static.
  static: (ctx, out) => noise(ctx, out, { length: 0.8, level: 0.12, filter: 'highpass', from: 1800, to: 3000 }),
  // A grain of rock flies by.
  zoom: (ctx, out) => {
    noise(ctx, out, { length: 0.35, level: 0.16, from: 3000, to: 300, q: 3 })
    tone(ctx, out, { type: 'sine', from: 1500, to: 200, length: 0.35, level: 0.06 })
  },
  // Ice found, or a good choice.
  bright: (ctx, out) => {
    tone(ctx, out, { type: 'triangle', from: 988, length: 0.12, level: 0.14 })
    tone(ctx, out, { type: 'triangle', from: 1480, length: 0.25, level: 0.12, at: 0.1 })
  },
  // Air bubbles in the cabin.
  bubbles: (ctx, out) => {
    for (let i = 0; i < 5; i += 1) tone(ctx, out, { type: 'sine', from: 300 + i * 90, to: 700 + i * 120, length: 0.08, level: 0.1, at: i * 0.09 })
  },
  // The engine coughs.
  cough: (ctx, out) => {
    for (const at of [0, 0.18, 0.3]) noise(ctx, out, { length: 0.12, level: 0.2, at, filter: 'lowpass', from: 600, to: 120 })
  },
})

/** Plays one synth recipe at the effects volume. Silently does nothing without WebAudio. */
export function playSynth(recipe) {
  const level = effectsLoudness()
  if (!recipe || level <= 0) return
  try {
    const ctx = audio()
    if (!ctx) return
    const out = ctx.createGain()
    out.gain.value = Math.min(1, level * 1.6)
    out.connect(ctx.destination)
    recipe(ctx, out)
    setTimeout(() => out.disconnect(), 2500)
  } catch {
    /* sounds are optional */
  }
}
