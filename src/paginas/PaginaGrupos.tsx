/**
 * Pantalla principal después de entrar.
 *
 * Muestra los grupos a los que pertenece el usuario y dos acciones rápidas:
 * crear un grupo nuevo o entrar en uno con un código de invitación.
 */

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Cabecera } from '../componentes/Cabecera'
import { BloqueError } from '../componentes/BloqueError'
import { IndicadorCarga } from '../componentes/IndicadorCarga'
import { usarAutenticacion } from '../autenticacion/AuthContext'
import {
  crearGrupo,
  obtenerMisGrupos,
  unirseAGrupo,
} from '../servicios/grupos'
import type { Grupo } from '../types'
import { traducirErrorFirebase } from '../utilidades/formatos'
import { useDatosRemotos } from '../utilidades/useDatosRemotos'

export function PaginaGrupos() {
  const { usuario } = usarAutenticacion()
  const uid = usuario?.uid ?? ''

  // La clave de dependencias es el uid: si cambia de usuario, recargamos.
  const { datos: grupos, cargando, error, recargar } = useDatosRemotos<Grupo[]>(
    () => obtenerMisGrupos(),
    uid,
  )

  const [mostrarCrear, setMostrarCrear] = useState(false)
  const [mostrarUnirse, setMostrarUnirse] = useState(false)
  const [nombreGrupo, setNombreGrupo] = useState('')
  const [descripcionGrupo, setDescripcionGrupo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [accionEnCurso, setAccionEnCurso] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  async function manejarCrear(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setErrorAccion(null)
    if (nombreGrupo.trim().length === 0) {
      setErrorAccion('Ponle un nombre al grupo.')
      return
    }
    setAccionEnCurso(true)
    try {
      await crearGrupo(nombreGrupo, descripcionGrupo)
      setNombreGrupo('')
      setDescripcionGrupo('')
      setMostrarCrear(false)
      recargar()
    } catch (errorReal) {
      setErrorAccion(traducirErrorFirebase(errorReal))
    } finally {
      setAccionEnCurso(false)
    }
  }

  async function manejarUnirse(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setErrorAccion(null)
    setAccionEnCurso(true)
    try {
      await unirseAGrupo(codigo)
      setCodigo('')
      setMostrarUnirse(false)
      recargar()
    } catch (errorReal) {
      setErrorAccion(traducirErrorFirebase(errorReal))
    } finally {
      setAccionEnCurso(false)
    }
  }

  return (
    <>
      <Cabecera />
      <main className="pagina">
        <div className="titulo-pagina">
          <div>
            <h1>Mis grupos</h1>
            <p className="subtitulo">Elige un grupo para ver sus planes o crea uno nuevo.</p>
          </div>
          <div className="botones-titulo">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => {
                setMostrarUnirse((valor) => !valor)
                setMostrarCrear(false)
                setErrorAccion(null)
              }}
            >
              Tengo un código
            </button>
            <button
              type="button"
              className="boton boton-primario"
              onClick={() => {
                setMostrarCrear((valor) => !valor)
                setMostrarUnirse(false)
                setErrorAccion(null)
              }}
            >
              + Nuevo grupo
            </button>
          </div>
        </div>

        {mostrarCrear && (
          <section className="card">
            <h2>Crear un grupo</h2>
            <form className="formulario" onSubmit={manejarCrear}>
              <div className="campo">
                <label htmlFor="nombre-grupo">Nombre</label>
                <input
                  id="nombre-grupo"
                  type="text"
                  value={nombreGrupo}
                  placeholder="Los del viernes"
                  onChange={(evento) => setNombreGrupo(evento.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="descripcion-grupo">Descripción (opcional)</label>
                <input
                  id="descripcion-grupo"
                  type="text"
                  value={descripcionGrupo}
                  placeholder="Quedadas de los viernes por la tarde"
                  onChange={(evento) => setDescripcionGrupo(evento.target.value)}
                />
              </div>
              <button type="submit" className="boton boton-primario" disabled={accionEnCurso}>
                Crear grupo
              </button>
            </form>
          </section>
        )}

        {mostrarUnirse && (
          <section className="card">
            <h2>Unirme con un código</h2>
            <form className="formulario" onSubmit={manejarUnirse}>
              <div className="campo">
                <label htmlFor="codigo-invitacion">Código de invitación</label>
                <input
                  id="codigo-invitacion"
                  type="text"
                  value={codigo}
                  placeholder="ABC23456"
                  autoCapitalize="characters"
                  onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
                />
              </div>
              <button type="submit" className="boton boton-primario" disabled={accionEnCurso}>
                Unirme
              </button>
            </form>
          </section>
        )}

        {errorAccion !== null && <BloqueError mensaje={errorAccion} />}

        {cargando && <IndicadorCarga mensaje="Buscando tus grupos…" />}
        {!cargando && error !== null && <BloqueError mensaje={error} alReintentar={recargar} />}

        {!cargando && error === null && grupos !== null && (
          grupos.length === 0 ? (
            <section className="card estado">
              <span aria-hidden="true">👋</span>
              <h2>Todavía no tienes grupos</h2>
              <p>Crea el primero o pide a un amigo que te pase su código de invitación.</p>
            </section>
          ) : (
            <div className="rejilla">
              {grupos.map((grupo) => (
                <Link
                  key={grupo.id}
                  to={`/grupos/${grupo.id}`}
                  className="tarjeta-grupo"
                >
                  <span className="icono-tarjeta" aria-hidden="true">👥</span>
                  <h2>{grupo.nombre}</h2>
                  <p>{grupo.descripcion || 'Sin descripción'}</p>
                  <span className="enlace-tarjeta">Ver planes →</span>
                </Link>
              ))}
            </div>
          )
        )}
      </main>
    </>
  )
}
