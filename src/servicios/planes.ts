/**
 * Operaciones de Firestore relacionadas con planes, opciones de fecha y votos.
 *
 * Un "plan" es la única entidad de quedada: antes se hablaba de ideas, pero
 * ambas cosas son lo mismo. Cada plan puede tener varias opciones de fecha y
 * los miembros votan la que prefieren.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { autenticacion, baseDeDatos } from '../firebase'
import type { DatosFormularioPlan, OpcionFecha, Plan, Voto } from '../types'

/** Devuelve el uid entrado o falla con un mensaje claro. */
function exigirUid(): string {
  const uid = autenticacion.currentUser?.uid
  if (uid === undefined) throw new Error('Debes iniciar sesión para hacer eso.')
  return uid
}

/** Crea un plan nuevo en el grupo indicado. Cualquier miembro puede hacerlo. */
export async function crearPlan(
  grupoId: string,
  datos: DatosFormularioPlan,
): Promise<string> {
  const uid = exigirUid()
  const opciones: OpcionFecha[] = datos.opciones.map((opcion) => ({
    id: crypto.randomUUID(),
    fechaInicio: opcion.fechaInicio,
    fechaFin: opcion.fechaFin,
    horaInicio: opcion.horaInicio,
  }))

  const referencia = await addDoc(collection(baseDeDatos, 'groups', grupoId, 'plans'), {
    grupoId,
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    precio: datos.precio,
    moneda: datos.moneda,
    creadoPor: uid,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
    editores: [],
    estado: 'propuesta',
    opciones,
    // Esta copia de ids permite a las reglas comprobar que un voto es válido.
    idsOpciones: opciones.map((opcion) => opcion.id),
    opcionConfirmadaId: null,
  })

  return referencia.id
}

/** Modifica título, descripción, precio u opciones de un plan existente. */
export async function actualizarPlan(
  grupoId: string,
  planId: string,
  datos: DatosFormularioPlan,
): Promise<void> {
  const opciones: OpcionFecha[] = datos.opciones.map((opcion) => ({
    ...opcion,
    // Si el plan se está reeditando conservamos los ids para no perder votos.
    id: opcion.id.length > 0 ? opcion.id : crypto.randomUUID(),
  }))

  await updateDoc(doc(baseDeDatos, 'groups', grupoId, 'plans', planId), {
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    precio: datos.precio,
    moneda: datos.moneda,
    opciones,
    idsOpciones: opciones.map((opcion) => opcion.id),
    actualizadoEn: serverTimestamp(),
  })
}

/** Cambia la lista de editores. Solo lo permite el creador del plan. */
export async function cambiarEditores(
  grupoId: string,
  planId: string,
  editores: string[],
): Promise<void> {
  await updateDoc(doc(baseDeDatos, 'groups', grupoId, 'plans', planId), {
    editores,
    actualizadoEn: serverTimestamp(),
  })
}

/** Borra un plan (únicamente lo permite su creador). */
export async function eliminarPlan(grupoId: string, planId: string): Promise<void> {
  await deleteDoc(doc(baseDeDatos, 'groups', grupoId, 'plans', planId))
}

/** Devuelve todos los planes del grupo, del más reciente al más antiguo. */
export async function listarPlanes(grupoId: string): Promise<Plan[]> {
  const consulta = query(
    collection(baseDeDatos, 'groups', grupoId, 'plans'),
    orderBy('creadoEn', 'desc'),
  )
  const resultado = await getDocs(consulta)
  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  })) as Plan[]
}

/** Lee un plan concreto. */
export async function obtenerPlan(
  grupoId: string,
  planId: string,
): Promise<Plan | null> {
  const documento = await getDoc(doc(baseDeDatos, 'groups', grupoId, 'plans', planId))
  if (!documento.exists()) return null
  return { id: documento.id, ...documento.data() } as Plan
}

/** Devuelve los votos de un plan para poder contar las preferencias. */
export async function listarVotos(grupoId: string, planId: string): Promise<Voto[]> {
  const resultado = await getDocs(
    collection(baseDeDatos, 'groups', grupoId, 'plans', planId, 'votes'),
  )
  return resultado.docs.map((documento) => ({
    uid: documento.id,
    ...documento.data(),
  })) as Voto[]
}

/** Registra o cambia el voto del usuario actual. Un documento por persona. */
export async function votarOpcion(
  grupoId: string,
  planId: string,
  opcionId: string,
): Promise<void> {
  const uid = exigirUid()
  await setDoc(
    doc(baseDeDatos, 'groups', grupoId, 'plans', planId, 'votes', uid),
    { uid, opcionId, actualizadoEn: serverTimestamp() },
  )
}

/** Marca una opción como elegida y cierra el plan a nuevos cambios de estado. */
export async function confirmarOpcion(
  grupoId: string,
  planId: string,
  opcionId: string,
): Promise<void> {
  await updateDoc(doc(baseDeDatos, 'groups', grupoId, 'plans', planId), {
    estado: 'confirmada',
    opcionConfirmadaId: opcionId,
    actualizadoEn: serverTimestamp(),
  })
}

/** Devuelve un plan confirmado a la fase de propuesta. */
export async function reabrirPlan(grupoId: string, planId: string): Promise<void> {
  await updateDoc(doc(baseDeDatos, 'groups', grupoId, 'plans', planId), {
    estado: 'propuesta',
    opcionConfirmadaId: null,
    actualizadoEn: serverTimestamp(),
  })
}
