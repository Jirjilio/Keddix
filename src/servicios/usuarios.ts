/**
 * Consultas de perfiles de usuario.
 *
 * Los documentos de otros miembros (users/{uid}) se leen para poder mostrar
 * nombres en la lista de votos o en la lista de editores asignados. Guardamos
 * el mismo nombre en cada miembro del grupo, pero el perfil es la fuente
 * oficial y siempre está actualizado.
 */

import { doc, getDoc } from 'firebase/firestore'
import { baseDeDatos } from '../firebase'
import type { Usuario } from '../types'

/**
 * Devuelve el perfil público de un usuario a partir de su uid.
 * Si el documento no existe (por ejemplo, una cuenta antigua borrada),
 * devolvemos null para que la interfaz pueda mostrar "Usuario desconocido".
 */
export async function obtenerPerfil(uid: string): Promise<Usuario | null> {
  const documento = await getDoc(doc(baseDeDatos, 'users', uid))
  if (!documento.exists()) return null
  return { uid: documento.id, ...documento.data() } as Usuario
}

/**
 * Resuelve varios uids de una vez. Promise.all lanza todas las peticiones en
 * paralelo y espera a que terminen, evitando una cadena de esperas innecesaria.
 * Devuelve un mapa uid -> nombre visible para poder pintarlo al instante.
 */
export async function obtenerNombresPorUid(
  uids: string[],
): Promise<Record<string, string>> {
  const uidsUnicos = Array.from(new Set(uids))
  if (uidsUnicos.length === 0) return {}

  const perfiles = await Promise.all(uidsUnicos.map((uid) => obtenerPerfil(uid)))
  const nombres: Record<string, string> = {}

  uidsUnicos.forEach((uid, indice) => {
    nombres[uid] = perfiles[indice]?.nombreVisible ?? 'Usuario desconocido'
  })

  return nombres
}
