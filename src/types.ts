/**
 * Definiciones de todas las entidades que se guardan en Firestore.
 *
 * Firestore almacena documentos con forma similar a JSON. Estas interfaces no
 * son obligatorias en tiempo de ejecución, pero nos avisan si escribimos un
 * campo con un nombre o tipo equivocado.
 */

import type { Timestamp } from 'firebase/firestore'

/** Roles que puede tener una persona dentro de un grupo. */
export type RolMiembro = 'owner' | 'member'

/** Estado de un plan: propuesta abierta a votos o plan ya decidido. */
export type EstadoPlan = 'propuesta' | 'confirmada'

/** Un usuario de la aplicación (documento users/{uid}). */
export interface Usuario {
  uid: string
  /** Al registrarse coincide con nombreUsuario; más adelante se podrá personalizar. */
  nombreVisible: string
  nombreUsuario: string
  nombreUsuarioNormalizado: string
  correo: string
  creadoEn: Timestamp
}

/**
 * Documento usado para poder iniciar sesión con @usuario.
 * La clave del documento es el usuario en minúsculas (usernames/{usuario}).
 */
export interface NombreUsuario {
  uid: string
  correo: string
  nombreUsuarioNormalizado: string
}

/** Un grupo de amigos (documento groups/{groupId}). */
export interface Grupo {
  id: string
  nombre: string
  descripcion: string
  creadoPor: string
  creadoEn: Timestamp
  codigoInvitacion: string
  invitacionActiva: boolean
}

/** Pertenencia de un usuario a un grupo (groups/{groupId}/members/{uid}). */
export interface Miembro {
  uid: string
  groupId: string
  rol: RolMiembro
  nombreVisible: string
  unidoEn: Timestamp
  /** Código usado para entrar. Solo se guarda para validar la invitación. */
  codigoInvitacionUsado?: string
}

/** Una de las fechas alternativas propuestas dentro de un plan. */
export interface OpcionFecha {
  id: string
  /** Fecha de inicio en formato YYYY-MM-DD. */
  fechaInicio: string
  /** Fecha de fin en YYYY-MM-DD, o null si es un Plan de un solo día. */
  fechaFin: string | null
  /** Hora de inicio en formato HH:mm. */
  horaInicio: string
}

/**
 * Un plan (antes "idea de quedada"), documentos groups/{groupId}/plans/{planId}.
 * Toda la información relevante de la quedada vive aquí.
 */
export interface Plan {
  id: string
  groupId: string
  titulo: string
  descripcion: string
  /** Precio total por persona, o null cuando la entrada es gratuita. */
  precio: number | null
  moneda: string
  creadoPor: string
  creadoEn: Timestamp
  actualizadoEn: Timestamp
  /** UIDs de los socios autorizados a editar, además del creador. */
  editores: string[]
  estado: EstadoPlan
  opciones: OpcionFecha[]
  /** Copia de los ids de opciones para poder validar votos en las reglas. */
  idsOpciones: string[]
  opcionConfirmadaId: string | null
}

/** Voto de un miembro a una opción (groups/{groupId}/plans/{planId}/votes/{uid}). */
export interface Voto {
  uid: string
  opcionId: string
  actualizadoEn: Timestamp
}

/** Invitación por código (documento invites/{codigo}). */
export interface Invitacion {
  codigo: string
  groupId: string
  creadoPor: string
  activa: boolean
  creadoEn: Timestamp
}

/** Datos introducidos en el formulario de creación o edición de un plan. */
export interface DatosFormularioPlan {
  titulo: string
  descripcion: string
  precio: number | null
  moneda: string
  opciones: OpcionFecha[]
}

/**
 * Mensaje de chat dentro de un plan, preparado para una fase futura.
 *
 * Hoy no hay interfaz de chat ni reglas que lo permitan, pero guardar la forma
 * del documento aquí nos obliga a pensar la estructura desde ahora. Cuando se
 * active, será groups/{groupId}/plans/{planId}/messages/{messageId}.
 */
export interface Mensaje {
  id: string
  autorUid: string
  autorNombre: string
  texto: string
  creadoEn: Timestamp
}
