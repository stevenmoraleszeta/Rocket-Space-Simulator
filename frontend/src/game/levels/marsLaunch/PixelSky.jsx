/**
 * The starry background of the menu (levels/assets space.svg), drawn without seams.
 *
 * An SVG made of little squares, stretched to a size that is not a whole multiple, shows thin
 * lines between the squares. Here every layer of the sky (the still sky, three groups of
 * twinkling stars and three shooting stars, split by lib/svgLayers.js) is painted once at its own
 * size (one square = one pixel) and then shown enlarged with pixelated scaling, so the squares
 * meet exactly. The twinkle and shooting-star animations are the menu's (missions.css).
 */
import { useEffect, useState } from 'react'
import { SPRITES } from '../../../levels'
import { splitLayers } from '../../../lib/svgLayers.js'

const TWINKLES = ['t1', 't2', 't3']
const SHOOTING = ['fugaz f1', 'fugaz f2', 'fugaz f3']

/** Paints an SVG (URL) on a canvas of its own size and returns a PNG data URL. */
function toPixelPng(url, width, height) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => resolve(url)
    image.src = url
  })
}

export function PixelSky() {
  const [sky, setSky] = useState(null)

  useEffect(() => {
    const raw = SPRITES.background?.raw
    if (!raw) return undefined
    let cancelled = false
    const split = splitLayers(raw, [...TWINKLES, ...SHOOTING])
    const names = [...TWINKLES, ...SHOOTING]
    Promise.all([
      toPixelPng(split.base, split.width, split.height),
      ...names.map((name) => toPixelPng(split.layers[name], split.width, split.height)),
    ]).then(([base, ...layers]) => {
      if (cancelled) return
      setSky({ base, layers: Object.fromEntries(names.map((name, index) => [name, layers[index]])), width: split.width, height: split.height })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!sky) return <div className="ms-bg__layer" aria-hidden="true" />
  const units = { '--sky-w': sky.width, '--sky-h': sky.height }
  const cls = 'ms-bg__layer has-image is-pixel'
  return (
    <>
      <img className={cls} src={sky.base} alt="" aria-hidden="true" />
      {TWINKLES.map((name, index) => (
        <img
          key={name}
          className={`${cls} ms-bg__overlay ms-bg__twinkle ms-bg__twinkle--${index + 1}`}
          src={sky.layers[name]}
          alt=""
          aria-hidden="true"
        />
      ))}
      {SHOOTING.map((name, index) => (
        <img
          key={name}
          className={`${cls} ms-bg__overlay ms-bg__shoot ms-bg__shoot--${index + 1}`}
          src={sky.layers[name]}
          style={units}
          alt=""
          aria-hidden="true"
        />
      ))}
    </>
  )
}
