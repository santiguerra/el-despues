// Genera los íconos PNG de la PWA sin dependencias: una sombra pixelada
// (El Después) sobre fondo morado oscuro. Arte temporal.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const DIBUJO = [
  '................',
  '................',
  '......####......',
  '....########....',
  '...##########...',
  '..############..',
  '..##YY####YY##..',
  '..##YY####YY##..',
  '..############..',
  '..############..',
  '..####....####..',
  '..############..',
  '..############..',
  '..##.##..##.##..',
  '................',
  '................',
]
const COLORES = { '.': [0x14, 0x0f, 0x26], '#': [0x6b, 0x4b, 0xd6], Y: [0xff, 0xd2, 0x3f] }

const TABLA = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = TABLA[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (tipo, datos) => {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

function png(tam, margen) {
  const area = Math.floor(tam * (1 - 2 * margen))
  const celda = Math.floor(area / 16)
  const inicio = Math.floor((tam - celda * 16) / 2)
  const filas = []
  for (let y = 0; y < tam; y++) {
    const fila = Buffer.alloc(1 + tam * 3)
    for (let x = 0; x < tam; x++) {
      const gx = Math.floor((x - inicio) / celda)
      const gy = Math.floor((y - inicio) / celda)
      const ch = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? DIBUJO[gy][gx] : '.'
      COLORES[ch].forEach((v, i) => (fila[1 + x * 3 + i] = v))
    }
    filas.push(fila)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(tam, 0)
  ihdr.writeUInt32BE(tam, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(filas))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, 0.04))
writeFileSync('public/icons/icon-512.png', png(512, 0.04))
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.18))
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.08))
console.log('Íconos generados en public/icons')
