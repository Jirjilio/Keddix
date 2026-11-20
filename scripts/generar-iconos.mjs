/**
 * Genera los iconos PNG de la PWA sin depender de librerías externas.
 *
 * Un PNG es basicamente una firma seguida de "chunks" (bloques): IHDR con el
 * tamano, IDAT con los pixeles comprimidos y IEND al final. Node trae zlib,
 * asi que podemos escribir el archivo directamente.
 *
 * Uso: node scripts/generar-iconos.mjs
 * Los archivos se crean en public/icons/.
 */

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TAMANOS = [192, 512]
const DIRECTORIO_SALIDA = join(process.cwd(), 'public', 'icons')

/** Tabla CRC32 que exige el formato PNG para validar cada bloque. */
const tablaCRC = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let valor = n
  for (let k = 0; k < 8; k += 1) {
    valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1
  }
  tablaCRC[n] = valor >>> 0
}

function calcularCRC(bufeto) {
  let valor = 0xffffffff
  for (const byte of bufeto) {
    valor = tablaCRC[(valor ^ byte) & 0xff] ^ (valor >>> 8)
  }
  return (valor ^ 0xffffffff) >>> 0
}

/** Construye un bloque PNG: longitud + tipo + datos + CRC. */
function crearBloque(tipo, datos) {
  const tipoBytes = Buffer.from(tipo, 'ascii')
  const longitud = Buffer.alloc(4)
  longitud.writeUInt32BE(datos.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(calcularCRC(Buffer.concat([tipoBytes, datos])), 0)
  return Buffer.concat([longitud, tipoBytes, datos, crc])
}

/** Devuelve true si el punto (x, y) cae cerca del segmento de recta dado. */
function puntoCercaDeSegmento(x, y, x1, y1, x2, y2, grosor) {
  const dx = x2 - x1
  const dy = y2 - y1
  const longitudAlCuadrado = dx * dx + dy * dy
  const t = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / longitudAlCuadrado),
  )
  const px = x1 + t * dx
  const py = y1 + t * dy
  return Math.hypot(x - px, y - py) <= grosor
}

/** Dibuja la letra K central sobre un fondo con degradado. */
function crearPixeles(tamano) {
  const pixeles = Buffer.alloc(tamano * tamano * 4)
  const mitad = tamano / 2
  const grosor = tamano * 0.045

  for (let y = 0; y < tamano; y += 1) {
    for (let x = 0; x < tamano; x += 1) {
      const indice = (y * tamano + x) * 4

      // Fondo degradado de indigo a violeta, con esquinas redondeadas.
      const dentro =
        x >= tamano * 0.06 &&
        x <= tamano * 0.94 &&
        y >= tamano * 0.06 &&
        y <= tamano * 0.94
      const mezcla = (x + y) / (tamano * 2)

      if (dentro) {
        pixeles[indice] = Math.round(99 + mezcla * 31)     // R
        pixeles[indice + 1] = Math.round(102 + mezcla * 38) // G
        pixeles[indice + 2] = Math.round(241 - mezcla * 15) // B
        pixeles[indice + 3] = 255                          // A
      } else {
        pixeles[indice] = 15
        pixeles[indice + 1] = 23
        pixeles[indice + 2] = 42
        pixeles[indice + 3] = 255
      }

      // Tres trazos blancos forman la K.
      const trazoVertical = puntoCercaDeSegmento(
        x, y, mitad * 0.68, tamano * 0.24, mitad * 0.68, tamano * 0.76, grosor,
      )
      const trazoArriba = puntoCercaDeSegmento(
        x, y, mitad * 1.28, tamano * 0.24, mitad * 0.72, tamano * 0.51, grosor,
      )
      const trazoAbajo = puntoCercaDeSegmento(
        x, y, mitad * 0.72, tamano * 0.51, mitad * 1.32, tamano * 0.76, grosor,
      )

      if (trazoVertical || trazoArriba || trazoAbajo) {
        pixeles[indice] = 255
        pixeles[indice + 1] = 255
        pixeles[indice + 2] = 255
        pixeles[indice + 3] = 255
      }
    }
  }

  return pixeles
}

function crearPNG(tamano) {
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(tamano, 0)         // ancho
  cabecera.writeUInt32BE(tamano, 4)         // alto
  cabecera[8] = 8                            // profundidad de color: 8 bits
  cabecera[9] = 6                            // tipo: RGBA
  cabecera[10] = 0                           // compresion
  cabecera[11] = 0                           // filtro
  cabecera[12] = 0                           // entrelazado

  // Cada fila de pixeles empieza con un byte 0 (sin filtro).
  const pixeles = crearPixeles(tamano)
  const filas = Buffer.alloc((tamano * 4 + 1) * tamano)
  for (let y = 0; y < tamano; y += 1) {
    const destino = y * (tamano * 4 + 1)
    filas[destino] = 0
    pixeles.copy(filas, destino + 1, y * tamano * 4, (y + 1) * tamano * 4)
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // firma PNG
    crearBloque('IHDR', cabecera),
    crearBloque('IDAT', deflateSync(filas, { level: 9 })),
    crearBloque('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(DIRECTORIO_SALIDA, { recursive: true })
for (const tamano of TAMANOS) {
  const ruta = join(DIRECTORIO_SALIDA, `icon-${tamano}.png`)
  writeFileSync(ruta, crearPNG(tamano))
  console.log(`Creado ${ruta}`)
}
