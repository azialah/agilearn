import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

// Minimal PNG encoder producing an Agilearn app icon:
// near-black rounded background with a light-blue "A" glyph block.
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function png(size) {
  const bg = [10, 13, 18, 255] // #0a0d12
  const accent = [92, 179, 255, 255] // light blue
  const px = (x, y) => {
    // rounded corners
    const r = size * 0.22
    const inCorner = (cx, cy) => (x - cx) ** 2 + (y - cy) ** 2 > r * r
    if (
      (x < r && y < r && inCorner(r, r)) ||
      (x > size - r && y < r && inCorner(size - r, r)) ||
      (x < r && y > size - r && inCorner(r, size - r)) ||
      (x > size - r && y > size - r && inCorner(size - r, size - r))
    ) {
      return [0, 0, 0, 0]
    }
    // draw an "A": two diagonal legs + crossbar
    const t = size * 0.11
    const nx = x / size
    const ny = y / size
    const leftLeg =
      Math.abs(nx - (0.5 - (ny - 0.2) * 0.35)) < t / size && ny > 0.2 && ny < 0.82
    const rightLeg =
      Math.abs(nx - (0.5 + (ny - 0.2) * 0.35)) < t / size && ny > 0.2 && ny < 0.82
    const bar = Math.abs(ny - 0.62) < t / size / 1.6 && nx > 0.34 && nx < 0.66
    if (leftLeg || rightLeg || bar) return accent
    return bg
  }

  const raw = Buffer.alloc((size * 4 + 1) * size)
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(x, y)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(new URL('../public/', import.meta.url), { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png(size))
  console.log(`wrote public/icon-${size}.png`)
}
