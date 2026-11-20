/**
 * Operaciones de Firestore relacionadas con grupos, miembros e invitaciones.
 *
 * La interfaz nunca escribe directamente en la base de datos: llama a estas
 * funciones, que construyen los documentos con los nombres de campo que
 * esperan las reglas de seguridad (firestore.rules).
 */

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { autenticacion, baseDeDatos } from '../firebase'
import type { Grupo, Miembro } from '../types'
import { generarCodigoInvitacion } from '../utilidades/formatos'

/** Devuelve el uid del usuario entrado o lanza un error explicativo. */
function exigirUid(): string {
  const uid = autenticacion.currentUser?.uid
  if (uid === undefined) {
    throw new Error('Debes iniciar sesión para realizar esta acción.')
  }
  return uid
}

/** Crea un grupo, añade a su creador como dueño y genera el código de invitación. */
export async function crearGrupo(nombre: string, descripcion: string): Promise<string> {
  const uid = exigirUid()
  const codigo = generarCodigoInvitacion()
  const referenciaGrupo = doc(collection(baseDeDatos, 'groups'))
  const grupoId = referenciaGrupo.id

  await setDoc(referenciaGrupo, {
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    creadoPor: uid,
    creadoEn: serverTimestamp(),
    codigoInvitacion: codigo,
    invitacionActiva: true,
  })

  // El dueño también es miembro; sin este documento nadie (ni él) podría leer
  // el grupo, porque las reglas exigen pertenencia para leer.
  await setDoc(doc(baseDeDatos, 'groups', grupoId, 'members', uid), {
    uid,
    grupoId,
    rol: 'owner',
    nombreVisible: autenticacion.currentUser?.displayName ?? 'Sin nombre',
    unidoEn: serverTimestamp(),
  })

  await setDoc(doc(baseDeDatos, 'invites', codigo), {
    codigo,
    grupoId,
    creadoPor: uid,
    activa: true,
    creadoEn: serverTimestamp(),
  })

  return grupoId
}

/**
 * Lista los grupos del usuario.
 *
 * Los documentos de pertenencia viven en groups/{id}/members/{uid}. Una
 * "collection group query" busca en TODAS las subcolecciones llamadas members
 * y filtra por nuestro uid; después leemos cada grupo por separado.
 */
export async function obtenerMisGrupos(): Promise<Grupo[]> {
  const uid = exigirUid()
  const consulta = query(
    collectionGroup(baseDeDatos, 'members'),
    where('uid', '==', uid),
  )
  const resultado = await getDocs(consulta)

  const grupos = await Promise.all(
    resultado.docs.map(async (documentoMiembro) => {
      const grupoId = String(documentoMiembro.data().grupoId)
      const documentoGrupo = await getDoc(doc(baseDeDatos, 'groups', grupoId))
      if (!documentoGrupo.exists()) return null
      return { id: documentoGrupo.id, ...documentoGrupo.data() } as Grupo
    }),
  )

  return grupos.filter((grupo): grupo is Grupo => grupo !== null)
}

/** Obtiene un grupo concreto. Las reglas garantizan que solo lo vea un miembro. */
export async function obtenerGrupo(grupoId: string): Promise<Grupo | null> {
  const documento = await getDoc(doc(baseDeDatos, 'groups', grupoId))
  if (!documento.exists()) return null
  return { id: documento.id, ...documento.data() } as Grupo
}

/** Lista los miembros de un grupo, ordenados por fecha de ingreso. */
export async function obtenerMiembros(grupoId: string): Promise<Miembro[]> {
  const resultado = await getDocs(collection(baseDeDatos, 'groups', grupoId, 'members'))
  return resultado.docs.map((documento) => ({
    uid: documento.id,
    ...documento.data(),
  })) as Miembro[]
}

/**
 * Se une a un grupo mediante código.
 * No leemos el grupo antes de entrar porque las reglas todavía no nos darían
 * acceso; el documento de invitación ya contiene el grupo al que pertenece.
 */
export async function unirseAGrupo(codigoIntroducido: string): Promise<string> {
  const uid = exigirUid()
  const codigo = codigoIntroducido.trim().toUpperCase()
  const documentoInvitacion = await getDoc(doc(baseDeDatos, 'invites', codigo))

  if (!documentoInvitacion.exists()) {
    throw new Error('Ese código de invitación no existe.')
  }
  if (documentoInvitacion.data().activa !== true) {
    throw new Error('Esa invitación está desactivada. Pide un código nuevo.')
  }

  const grupoId = String(documentoInvitacion.data().grupoId)

  // Si ya pertenece al grupo, no intentamos crear el documento otra vez.
  const miembroYaExistente = await getDoc(
    doc(baseDeDatos, 'groups', grupoId, 'members', uid),
  )
  if (miembroYaExistente.exists()) return grupoId

  await setDoc(doc(baseDeDatos, 'groups', grupoId, 'members', uid), {
    uid,
    grupoId,
    rol: 'member',
    nombreVisible: autenticacion.currentUser?.displayName ?? 'Sin nombre',
    unidoEn: serverTimestamp(),
    codigoInvitacionUsado: codigo,
  })

  return grupoId
}

/**
 * Genera un código nuevo y desactiva el anterior en una sola operación atómica.
 * Solo lo podrá llamar el dueño del grupo (lo comprueban las reglas).
 */
export async function regenerarCodigoInvitacion(grupoId: string): Promise<string> {
  const uid = exigirUid()
  const grupo = await obtenerGrupo(grupoId)
  if (grupo === null) throw new Error('No encontramos ese grupo.')

  const codigoAnterior = grupo.codigoInvitacion
  const codigoNuevo = generarCodigoInvitacion()
  const lote = writeBatch(baseDeDatos)

  lote.set(doc(baseDeDatos, 'invites', codigoNuevo), {
    codigo: codigoNuevo,
    grupoId,
    creadoPor: uid,
    activa: true,
    creadoEn: serverTimestamp(),
  })

  const invitacionAnterior = await getDoc(doc(baseDeDatos, 'invites', codigoAnterior))
  if (invitacionAnterior.exists()) {
    lote.update(doc(baseDeDatos, 'invites', codigoAnterior), { activa: false })
  }

  lote.update(doc(baseDeDatos, 'groups', grupoId), {
    codigoInvitacion: codigoNuevo,
    invitacionActiva: true,
  })

  await lote.commit()
  return codigoNuevo
}

/** Activa o desactiva la invitación actual del grupo. */
export async function cambiarEstadoInvitacion(
  grupoId: string,
  activa: boolean,
): Promise<void> {
  const grupo = await obtenerGrupo(grupoId)
  if (grupo === null) throw new Error('No encontramos ese grupo.')

  const lote = writeBatch(baseDeDatos)
  lote.update(doc(baseDeDatos, 'groups', grupoId), { invitacionActiva: activa })
  lote.update(doc(baseDeDatos, 'invites', grupo.codigoInvitacion), { activa })
  await lote.commit()
}

/** Permite a un miembro no dueño abandonar el grupo. */
export async function abandonarGrupo(grupoId: string): Promise<void> {
  await deleteDoc(doc(baseDeDatos, 'groups', grupoId, 'members', exigirUid()))
}

/**
 * Construye la URL completa de invitación. Usamos hash porque GitHub Pages
 * es alojamiento estático y el router de la app trabaja con URLs '#/...'.
 */
export function construirEnlaceInvitacion(codigo: string): string {
  return `${window.location.origin}${window.location.pathname}#/unirse?codigo=${codigo}`
}

/** Actualiza nombre y descripción del grupo (solo dueño, según reglas). */
export async function actualizarGrupo(
  grupoId: string,
  nombre: string,
  descripcion: string,
): Promise<void> {
  await updateDoc(doc(baseDeDatos, 'groups', grupoId), {
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
  })
}
