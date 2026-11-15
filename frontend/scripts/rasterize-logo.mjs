// Rebuilds the PNG icons from public/favicon.svg. Run: node scripts/rasterize-logo.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = path.resolve(import.meta.dirname, '..')
const svg = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8')

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function hex(color) {
  const n = color.slice(1)
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), 255]
}

const size = 32
const buf = Buffer.alloc(size * size * 4, 0)
for (const match of svg.matchAll(/<rect\s+([^>/]+)\/>/g)) {
  const source = match[1]
  const attr = (name, fallback = 0) => {
    const found = source.match(new RegExp(`${name}="([^"]+)"`))
    return found ? Number(found[1]) : fallback
  }
  const x = attr('x')
  const y = attr('y')
  const w = attr('width', size)
  const h = attr('height', size)
  const [r, g, b, a] = hex(source.match(/fill="([^"]+)"/)[1])
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue
      const i = (yy * size + xx) * 4
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = a
    }
  }
}

function scale(srcW, src, dstW) {
  const dst = Buffer.alloc(dstW * dstW * 4)
  for (let y = 0; y < dstW; y += 1) {
    const sy = Math.min(srcW - 1, Math.floor((y * srcW) / dstW))
    for (let x = 0; x < dstW; x += 1) {
      const sx = Math.min(srcW - 1, Math.floor((x * srcW) / dstW))
      const si = (sy * srcW + sx) * 4
      const di = (y * dstW + x) * 4
      dst[di] = src[si]
      dst[di + 1] = src[si + 1]
      dst[di + 2] = src[si + 2]
      dst[di + 3] = src[si + 3]
    }
  }
  return dst
}

const pub = path.join(root, 'public')
fs.writeFileSync(path.join(pub, 'favicon-32.png'), png(32, 32, buf))
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), png(180, 180, scale(32, buf, 180)))
fs.writeFileSync(path.join(pub, 'icon-512.png'), png(512, 512, scale(32, buf, 512)))
console.log('wrote favicon pngs')
