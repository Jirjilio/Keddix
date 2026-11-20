/**
 * RESTAURAR UNA COPIA HECHA CON exportar-firestore.mjs
 * ====================================================
 * ADVERTENCIA: escribe sobre los documentos existentes con las mismas rutas.
 * Por eso hay que pasar la opción --confirm de forma explícita:
 *
 *   npm run restore -- backups/backup-2026-12-01-0930.json --confirm
 *
 * (Sin --confirm el script solo muestra lo que haría y no escribe nada.)
 *
 * La restauración NO borra documentos que estén ahora en Firestore pero no
 * estuvieran en la copia. Es una recuperación "por encima", no un rollback
 * total. Para un borrado accidental de un documento, basta con esta opción.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

/** Argumentos: ruta del JSON y, opcionalmente, la palabra --confirm. */
const argumentos = process.argv.slice(2)
const rutaCopia = argumentos.find((valor) => valor.endsWith('.json'))
const confirmado = argumentos.includes('--confirm')

if (rutaCopia === undefined) {
  console.error('Uso: npm run restore -- <archivo.json> [--confirm]')
  process.exit(1)
}

const rutaClave =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
  resolve(process.cwd(), 'serviceAccount.json')
const claveServicio = JSON.parse(readFileSync(rutaClave, 'utf8'))

if (getApps().length === 0) {
  initializeApp({ credential: cert(claveServicio) })
}
const baseDeDatos = getFirestore()

const copia = JSON.parse(readFileSync(resolve(rutaCopia), 'utf8'))
if (copia.formato !== 'keddix-backup-v1') {
  console.error('Ese archivo no es una copia de Keddix compatible.')
  process.exit(1)
}

/** Convierte nuestro marcador __timestamp de vuelta a un Timestamp real. */
function convertirDesdeJSON(valor) {
  if (
    valor !== null &&
    typeof valor === 'object' &&
    !Array.isArray(valor) &&
    '__timestamp' in valor
  ) {
    return Timestamp.fromDate(new Date(valor.__timestamp))
  }
  if (Array.isArray(valor)) {
    return valor.map(convertirDesdeJSON)
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, valorInterno]) => [
        clave,
        convertirDesdeJSON(valorInterno),
      ]),
    )
  }
  return valor
}

async function main() {
  console.log(`Copia: ${rutaCopia}`)
  console.log(`Creada: ${copia.creadoEn}`)
  console.log(`Documentos: ${copia.numeroDocumentos}`)

  if (!confirmado) {
    console.log('\nMODO SIMULACIÓN: no se ha escrito nada.')
    console.log('Añade --confirm al comando para aplicar la restauración.')
    return
  }

  // Firestore permite 500 operaciones por lote. Procesamos en tandas de 400
  // para ir sobrados y no superar el límite.
  const TAMANO_LOTE = 400
  let lote = baseDeDatos.batch()
  let operacionesEnLote = 0
  let total = 0

  for (const documento of copia.documentos) {
    lote.set(baseDeDatos.doc(documento.ruta), convertirDesdeJSON(documento.datos))
    operacionesEnLote += 1
    total += 1

    if (operacionesEnLote === TAMANO_LOTE) {
      await lote.commit()
      lote = baseDeDatos.batch()
      operacionesEnLote = 0
      console.log(`  restaurados ${total}…`)
    }
  }

  if (operacionesEnLote > 0) {
    await lote.commit()
  }

  console.log(`\nRestauración terminada: ${total} documentos.`)
}

main().catch((error) => {
  console.error('Error al restaurar:', error)
  process.exit(1)
})
