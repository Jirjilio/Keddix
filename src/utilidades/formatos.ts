/**
 * Funciones pequeñas y puras para formatter datos en la interfaz.
 * Están separadas de los componentes para poder reutilizarlas y probarlas.
 */

import type { OpcionFecha } from '../types'

/** Convierte '2026-11-21' a una fecha JS interpretando solo día/mes/año. */
function convertirCadenaAFecha(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  // Los meses de Date empiezan en 0 (enero = 0), por eso restamos 1.
  return new Date(anio, mes - 1, dia)
}

const formateadorDia = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const formateadorDiaLargo = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Devuelve algo como "sáb, 21 nov" para una fecha suelta. */
export function formatearFechaSola(fechaISO: string): string {
  return formateadorDia.format(convertirCadenaAFecha(fechaISO))
}

/**
 * Describe una opción de fecha completa:
 * - Un solo día: "sáb, 21 nov · 20:00"
 * - Varios días: "21 nov 2026 – 23 nov 2026 · 20:00"
 */
export function formatearOpcion(opcion: OpcionFecha): string {
  const fechaInicio = convertirCadenaAFecha(opcion.fechaInicio)
  const textoFecha =
    opcion.fechaFin === null
      ? formateadorDiaLargo.format(fechaInicio)
      : `${formateadorDiaLargo.format(fechaInicio)} – ${formateadorDiaLargo.format(
          convertirCadenaAFecha(opcion.fechaFin),
        )}`

  return `${textoFecha} · ${opcion.horaInicio}`
}

/** Devuelve el precio con formato de moneda español, o "Gratis". */
export function formatearPrecio(precio: number | null, moneda: string): string {
  if (precio === null) return 'Gratis'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda,
  }).format(precio)
}

/** Normaliza un nombre de usuario: sin espacios y en minúsculas. */
export function normalizarNombreUsuario(valor: string): string {
  return valor.trim().toLowerCase()
}

/** Un nombre de usuario válido tiene entre 3 y 20 caracteres ASCII. */
export function esNombreUsuarioValido(valor: string): boolean {
  return /^[a-zA-Z0-9_.-]{3,20}$/.test(valor.trim())
}

/**
 * Genera un código de invitación fácil de dictar y teclear.
 * Se excluyen caracteres confusos como 0/O o 1/I.
 */
export function generarCodigoInvitacion(longitud = 8): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const valores = new Uint32Array(longitud)
  crypto.getRandomValues(valores)

  return Array.from(valores, (valor) => alfabeto[valor % alfabeto.length]).join('')
}

/** Traduce los errores habituales de Firebase a mensajes en español. */
export function traducirErrorFirebase(error: unknown): string {
  const codigo =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  const mensajes: Record<string, string> = {
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/missing-password': 'Escribe tu contraseña.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
    'auth/invalid-credential': 'El usuario o la contraseña no son correctos.',
    'auth/user-not-found': 'No encontramos ninguna cuenta con esos datos.',
    'auth/wrong-password': 'La contraseña no es correcta.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a probar.',
    'auth/network-request-failed': 'No hay conexión. Comprueba tu red e inténtalo de nuevo.',
    'permission-denied': 'No tienes permiso para hacer esa acción.',
    'failed-precondition': 'Falta terminar la configuración de la base de datos. Avísame y la arreglo.',
  }

  return (
    mensajes[codigo] ??
    (error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.')
  )
}
