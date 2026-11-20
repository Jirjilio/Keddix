/**
 * Página de destino de los enlaces de invitación: /#/unirse?codigo=XXXXXXXX
 *
 * Al abrirla, el código viene en la URL y se rellena automáticamente. Si el
 * usuario todavía no ha entrado, le pedimos que lo haga y guardamos el código
 * para continuar justo después (usamos sessionStorage, que se borra al cerrar
 * la pestaña pero sobrevive al cambio de ruta).
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Cabecera } from '../componentes/Cabecera'
import { BloqueError } from '../componentes/BloqueError'
import { usarAutenticacion } from '../autenticacion/AuthContext'
import { unirseAGrupo } from '../servicios/grupos'
import { traducirErrorFirebase } from '../utilidades/formatos'

/** Clave usada en sessionStorage para recordar la invitación pendiente. */
const CLAVE_INVITACION_PENDIENTE = 'keddix-invitacion-pendiente'

export function PaginaUnirse() {
  const [parametros] = useSearchParams()
  const codigoUrl = parametros.get('codigo') ?? ''
  const navegar = useNavigate()
  const { usuario, cargando } = usarAutenticacion()

  const [codigo, setCodigo] = useState(codigoUrl.toUpperCase())
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guardamos el código para recuperarlo si hay que pasar por la pantalla de acceso.
  useEffect(() => {
    if (codigoUrl.length > 0) {
      sessionStorage.setItem(CLAVE_INVITACION_PENDIENTE, codigoUrl.toUpperCase())
    }
  }, [codigoUrl])

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError(null)
    setProcesando(true)
    try {
      const grupoId = await unirseAGrupo(codigo)
      sessionStorage.removeItem(CLAVE_INVITACION_PENDIENTE)
      navegar(`/grupos/${grupoId}`, { replace: true })
    } catch (errorReal) {
      setError(traducirErrorFirebase(errorReal))
    } finally {
      setProcesando(false)
    }
  }

  if (cargando) {
    return <div className="pantalla-centrada"><p>Un momento…</p></div>
  }

  if (usuario === null) {
    // Guardamos también el destino deseado por si la app decides usar una
    // redirección más elaborada en el futuro.
    const destino = `/unirse?codigo=${codigo}`
    return <Navigate to={`/entrar?redirigir=${encodeURIComponent(destino)}`} replace />
  }

  return (
    <>
      <Cabecera />
      <main className="pagina pagina-estrecha">
        <section className="card">
          <h1>Te han invitado a un grupo</h1>
          <p className="subtitulo">Revisa el código y pulsa “Unirme”.</p>
          {error !== null && <BloqueError mensaje={error} />}
          <form className="formulario" onSubmit={manejarEnvio}>
            <div className="campo">
              <label htmlFor="codigo-unirse">Código de invitación</label>
              <input
                id="codigo-unirse"
                type="text"
                value={codigo}
                autoCapitalize="characters"
                onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
              />
            </div>
            <button type="submit" className="boton boton-primario" disabled={procesando}>
              {procesando ? 'Uniéndote…' : 'Unirme al grupo'}
            </button>
          </form>
        </section>
      </main>
    </>
  )
}
