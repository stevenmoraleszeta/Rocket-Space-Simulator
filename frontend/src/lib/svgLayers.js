/**
 * Turns animated pixel-art SVGs into still pictures the browser draws once.
 *
 * An <img> of an SVG with CSS animations inside is redrawn by the browser on every frame
 * (style, paint and raster of the whole picture), even when nothing on the page moves.
 * For the big space background and the 2300-pixel waving flag that cost made the menu and
 * the hangar feel slow. Here the source SVG is split into still layers (blob URLs) that the
 * page animates with CSS transform/opacity, which the GPU does without redrawing anything.
 *
 * The source SVGs stay as they are, so editing them still changes the game.
 */

const SVG_TYPE = 'image/svg+xml'
const cache = new Map()

function parse(raw) {
  return new DOMParser().parseFromString(raw, SVG_TYPE).documentElement
}

function toUrl(svg) {
  const text = new XMLSerializer().serializeToString(svg)
  return URL.createObjectURL(new Blob([text], { type: SVG_TYPE }))
}

function viewBoxSize(svg) {
  const [, , width, height] = (svg.getAttribute('viewBox') ?? '0 0 0 0').split(/[\s,]+/).map(Number)
  return { width, height }
}

/** A copy of the picture without its <style> (so nothing inside it animates). */
function stillCopy(svg) {
  const copy = svg.cloneNode(true)
  copy.querySelectorAll('style').forEach((style) => style.remove())
  return copy
}

/**
 * Sprite strip from an SVG whose frames are <g class="f0">, <g class="f1">, ... laid side by side,
 * frame 0 on the left. Returns { url, frames, width, height } (width/height of one frame).
 */
export function frameStrip(raw, framePrefix = 'f') {
  const key = `strip:${framePrefix}:${raw}`
  if (cache.has(key)) return cache.get(key)
  const svg = stillCopy(parse(raw))
  const { width, height } = viewBoxSize(svg)
  const groups = [...svg.querySelectorAll(`:scope > g[class^="${framePrefix}"]`)]
    .filter((group) => new RegExp(`^${framePrefix}\\d+$`).test(group.getAttribute('class')))
    .sort((a, b) => Number(a.getAttribute('class').slice(framePrefix.length)) - Number(b.getAttribute('class').slice(framePrefix.length)))
  groups.forEach((group, index) => {
    group.removeAttribute('class')
    group.setAttribute('transform', `translate(${width * index} 0)`)
  })
  const frames = Math.max(1, groups.length)
  svg.setAttribute('viewBox', `0 0 ${width * frames} ${height}`)
  const pixelWidth = Number(svg.getAttribute('width')) || width
  const pixelHeight = Number(svg.getAttribute('height')) || height
  svg.setAttribute('width', String(pixelWidth * frames))
  svg.setAttribute('height', String(pixelHeight))
  const result = { url: toUrl(svg), frames, width, height }
  cache.set(key, result)
  return result
}

/**
 * Splits a picture into a still base and one still layer per animated class.
 * classNames: the classes whose elements move or blink (e.g. ['t1', 'fugaz f1']).
 * An element belongs to a layer when it has every class of that name.
 * Returns { base, layers: { [className]: url }, width, height } (viewBox size).
 */
export function splitLayers(raw, classNames) {
  const key = `split:${classNames.join('|')}:${raw}`
  if (cache.has(key)) return cache.get(key)
  const source = stillCopy(parse(raw))
  const { width, height } = viewBoxSize(source)
  const selectorFor = (name) => name.split(/\s+/).map((part) => `.${part}`).join('')

  const base = source.cloneNode(true)
  classNames.forEach((name) => base.querySelectorAll(selectorFor(name)).forEach((node) => node.remove()))

  const layers = {}
  classNames.forEach((name) => {
    const layer = source.cloneNode(false)
    // Keep <defs> (gradients and patterns the layer may use)
    source.querySelectorAll(':scope > defs').forEach((defs) => layer.appendChild(defs.cloneNode(true)))
    source.querySelectorAll(selectorFor(name)).forEach((node) => {
      const copy = node.cloneNode(true)
      copy.removeAttribute('class')
      layer.appendChild(copy)
    })
    layers[name] = toUrl(layer)
  })

  const result = { base: toUrl(base), layers, width, height }
  cache.set(key, result)
  return result
}
