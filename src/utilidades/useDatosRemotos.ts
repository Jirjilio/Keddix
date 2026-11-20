/**
 * Hook reutilizable para cargar datos remotos con estados de carga y error.
 *
 * Todas las pantallas hacen lo mismo: al entrar piden datos a Firestore,
 * muestran un "Cargando...", y si algo falla muestran el error y un botón de
 * reintento. Este hook concentra esa lógica para no repetirla en cada archivo.
 */

import { useEffect, useRef, useState } from 'react'
import { traducirErrorFirebase } from './formatos'

/** Lo que devuelve el hook a la pantalla que lo usa. */
export interface ResultadoDatosRemotos<T> {
  datos: T | null
  cargando: boolean
  error: string | null
  /** Vuelve a ejecutar la carga (lo llama el botón "Reintentar"). */
  recargar: () => void
}

/**
 * @param cargarDatos función asíncrona que obtiene los datos (por ejemplo, listarPlanes).
 * @param claveDependencias texto que identifica de qué dependen los datos;
 *        cuando cambia (por ejemplo, el id del grupo) se vuelven a pedir.
 *
 * La función se guarda en un ref para no tener que incluirla en las
 * dependencias del useEffect: así una función recreada en cada render no
 * provoca una recarga infinita.
 */
export function useDatosRemotos<T>(
  cargarDatos: () => Promise<T>,
  claveDependencias: string,
): ResultadoDatosRemotos<T> {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numeroIntento, setNumeroIntento] = useState(0)

  const funcionRef = useRef(cargarDatos)
  useEffect(() => {
    funcionRef.current = cargarDatos
  }, [cargarDatos])

  useEffect(() => {
    // "activo" evita actualizar el estado si el usuario ya cambió de pantalla
    // mientras la petición seguía en camino (React avisaría de un memory leak).
    let activo = true
    setCargando(true)
    setError(null)

    funcionRef
      .current()
      .then((resultado) => {
        if (activo) setDatos(resultado)
      })
      .catch((errorReal: unknown) => {
        if (activo) setError(traducirErrorFirebase(errorReal))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [claveDependencias, numeroIntento])

  return {
    datos,
    cargando,
    error,
    recargar: () => setNumeroIntento((valor) => valor + 1),
  }
}
