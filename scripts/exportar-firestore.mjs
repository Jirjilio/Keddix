/**
 * COPIA DE SEGURIDAD MANUAL DE FIRESTORE (sin coste)
 * ==================================================
 * La exportación gestionada de Firebase (copias automáticas en la nube)
 * exige el plan de pago Blaze. Este script es la alternativa gratuita:
 * lee TODOS los documentos con la Admin SDK y los guarda en un JSON local.
 *
 * La Admin SDK se salta las reglas de seguridad, así que necesita una clave
 * de cuenta de servicio. Esa clave es un secreto: no se sube a GitHub.
 *
 * Preparación (una sola vez):
 * 1. Firebase Console → Configuración del proyecto → Cuentas de servicio.
 * 2. "Generar nueva clave privada" → se descarga un .json.
 * 3. Guárdalo en la raíz del proyecto con el nombre serviceAccount.json.
 *    (Ya está en .gitignore, así que no aparecerá en git.)
 *
 * Uso: npm run backup
 * Resultado: backups/backup-AAAA-MM-DD-HHmm.json
 *
 * Coste: las lecturas entran en la capa gratuita de Spark (50.000/día).
 * Con unos cuantos grupos y planes, una copia usa unas pocas decenas.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

/** Ruta de la clave: variable de entorno o archivo por defecto en la raíz. */
const rutaClave =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
  join(process.cwd(), 'serviceAccount.json')

let claveServicio
try {
  claveServicio = JSON.parse(readFileSync(rutaClave, 'utf8'))
} catch {
  console.error(`No se pudo leer ${rutaClave}. Consulta las instrucciones de arriba.`)
  process.exit(1)
}

// initializeApp solo se puede llamar una vez por proceso.
if (getApps().length === 0) {
  initializeApp({ credential: cert(claveServicio) })
}

const baseDeDatos = getFirestore()

/**
 * Firestore guarda fechas como objetos Timestamp, que JSON no sabe serializar.
 * Las convertimos a un marcador propio: { __timestamp: '2026-11-20T...' }.
 * El script de restauración lo vuelve a convertir en Timestamp.
 */
function convertirParaJSON(valor) {
  if (valor instanceof Timestamp) {
    return { __timestamp: valor.toDate().toISOString() }
  }
  if (Array.isArray(valor)) {
    return valor.map(convertirParaJSON)
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, valorInterno]) => [
        clave,
        convertirParaJSON(valorInterno),
      ]),
    )
  }
  // string, número, booleano o null: se guardan tal cual.
  return valor
}

/**
 * Recorre una colección y, de forma recursiva, todas sus subcolecciones.
 * Así se incluyen groups/{id}/members, groups/{id}/plans,
 * groups/{id}/plans/{id}/votes, etc.
 */
async function exportarColeccion(rutaColeccion) {
  const documentos = []
  const instantanea = await baseDeDatos.collection(rutaColeccion).get()

  for (const documento of instantanea.docs) {
    const rutaDocumento = `${rutaColeccion}/${documento.id}`
    documentos.push({
      ruta: rutaDocumento,
      datos: convertirParaJSON(documento.data()),
    })

    const subcolecciones = await documento.ref.listCollections()
    for (const subcoleccion of subcolecciones) {
      documentos.push(
        ...(await exportarColeccion(`${rutaDocumento}/${subcoleccion.id}`)),
      )
    }
  }

  return documentos
}

async function main() {
  const colecciones = await baseDeDatos.listCollections()
  const todosLosDocumentos = []

  for (const coleccion of colecciones) {
    process.stdout.write(`Leyendo ${coleccion.id}… `)
    const documentos = await exportarColeccion(coleccion.path)
    todosLosDocumentos.push(...documentos)
    console.log(`${documentos.length} documentos`)
  }

  const ahora = new Date()
  const sufijo = ahora.toISOString().slice(0, 16).replace(/[-:T]/g, '')
  const nombreArchivo = `backup-${ahora.toISOString().slice(0, 10)}-${sufijo.slice(8)}.json`
  const directorio = join(process.cwd(), 'backups')
  mkdirSync(directorio, { recursive: true })

  const rutaSalida = join(directorio, nombreArchivo)
  writeFileSync(
    rutaSalida,
    JSON.stringify(
      {
        formato: 'keddix-backup-v1',
        creadoEn: ahora.toISOString(),
        proyecto: claveServicio.project_id,
        numeroDocumentos: todosLosDocumentos.length,
        documentos: todosLosDocumentos,
      },
      null,
      2,
    ),
    'utf8',
  )

  console.log(`\nCopia guardada: ${rutaSalida}`)
  console.log(`Total: ${todosLosDocumentos.length} documentos en ${colecciones.length} colecciones.`)
  console.log('Guarda ese archivo también fuera del PC (disco externo, Drive, etc.).')
}

main().catch((error) => {
  console.error('Error al hacer la copia:', error)
  process.exit(1)
})
