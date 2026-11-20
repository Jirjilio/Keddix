/**
 * Detalle de un grupo: miembros, invitación y lista de planes.
 *
 * Solo se puede llegar aquí siendo miembro: las reglas de Firestore impiden
 * leer el grupo en caso contrario. Aun así, mostramos un mensaje amable si el
 * grupo desaparece o el usuario deja de pertenecer a él.
 */

import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Cabecera } from '../componentes/Cabecera'
import { BloqueError } from '../componentes/BloqueError'
import { IndicadorCarga } from '../componentes/IndicadorCarga'
import { TarjetaPlan } from '../componentes/TarjetaPlan'
import { usarAutenticacion } from '../autenticacion/AuthContext'
import {
  abandonarGrupo,
  actualizarGrupo,
  cambiarEstadoInvitacion,
  construirEnlaceInvitacion,
  obtenerGrupo,
  obtenerMiembros,
  regenerarCodigoInvitacion,
} from '../servicios/grupos'
import { listarPlanes } from '../servicios/planes'
import type { Grupo, Miembro, Plan } from '../types'
import { traducirErrorFirebase } from '../utilidades/formatos'
import { useDatosRemotos } from '../utilidades/useDatosRemotos'
import { useNavigate } from 'react-router-dom'

/** Conjunto de datos que necesita esta pantalla. */
interface DatosDetalleGrupo {
  grupo: Grupo | null
  miembros: Miembro[]
  planes: Plan[]
}

export function PaginaGrupo() {
  // useParams lee el :grupoId de la URL definida en App.tsx.
  const { grupoId = '' } = useParams()
  const navegar = useNavigate()
  const { usuario } = usarAutenticacion()
  const uidActual = usuario?.uid ?? ''

  const { datos, cargando, error, recargar } = useDatosRemotos<DatosDetalleGrupo>(
    async () => {
      // Pedimos las tres colecciones en paralelo para no esperar de uno en uno.
      const [grupo, miembros, planes] = await Promise.all([
        obtenerGrupo(grupoId),
        obtenerMiembros(grupoId),
        listarPlanes(grupoId),
      ])
      return { grupo, miembros, planes }
    },
    grupoId,
  )

  const [editandoGrupo, setEditandoGrupo] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [accionEnCurso, setAccionEnCurso] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const grupo = datos?.grupo ?? null
  const esDueno = grupo?.creadoPor === uidActual

  async function ejecutarAccion(accion: () => Promise<void>): Promise<void> {
    setErrorAccion(null)
    setAccionEnCurso(true)
    try {
      await accion()
      recargar()
    } catch (errorReal) {
      setErrorAccion(traducirErrorFirebase(errorReal))
    } finally {
      setAccionEnCurso(false)
    }
  }

  async function manejarGuardarGrupo(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (grupo === null) return
    await ejecutarAccion(async () => {
      await actualizarGrupo(grupo.id, nombre, descripcion)
      setEditandoGrupo(false)
    })
  }

  async function copiarEnlace(): Promise<void> {
    if (grupo === null) return
    const enlace = construirEnlaceInvitacion(grupo.codigoInvitacion)
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErrorAccion('No se pudo copiar. Puedes seleccionar el enlace manualmente.')
    }
  }

  async function salirDelGrupo(): Promise<void> {
    await ejecutarAccion(async () => {
      await abandonarGrupo(grupoId)
      navegar('/grupos', { replace: true })
    })
  }

  return (
    <>
      <Cabecera />
      <main className="pagina">
        <Link to="/grupos" className="enlace-volver">← Mis grupos</Link>

        {cargando && <IndicadorCarga mensaje="Abriendo el grupo…" />}
        {!cargando && error !== null && <BloqueError mensaje={error} alReintentar={recargar} />}

        {!cargando && error === null && grupo === null && (
          <section className="card estado">
            <h1>Grupo no disponible</h1>
            <p>No encontramos este grupo o ya no eres miembro.</p>
          </section>
        )}

        {!cargando && error === null && grupo !== null && datos !== null && (
          <>
            <div className="titulo-pagina">
              <div>
                <h1>{grupo.nombre}</h1>
                <p className="subtitulo">{grupo.descripcion || 'Sin descripción'}</p>
              </div>
              <Link to={`/grupos/${grupo.id}/planes/nuevo`} className="boton boton-primario">
                + Nuevo plan
              </Link>
            </div>

            {errorAccion !== null && <BloqueError mensaje={errorAccion} />}

            <div className="columnas">
              <div>
                <section className="card">
                  <div className="cabecera-seccion">
                    <h2>Planes del grupo</h2>
                    <span className="contador">{datos.planes.length}</span>
                  </div>
                  {datos.planes.length === 0 ? (
                    <p className="ayuda">
                      Aún no hay planes. ¡Propón el primero! Cualquier miembro puede hacerlo.
                    </p>
                  ) : (
                    <div className="lista-planes">
                      {datos.planes.map((plan) => (
                        <TarjetaPlan key={plan.id} grupoId={grupo.id} plan={plan} />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="barra-lateral">
                <section className="card">
                  <h2>Miembros</h2>
                  <ul className="lista-miembros">
                    {datos.miembros.map((miembro) => (
                      <li key={miembro.uid}>
                        <span className="avatar" aria-hidden="true">
                          {miembro.nombreVisible.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          {miembro.nombreVisible}
                          {miembro.rol === 'owner' && <small> · dueño</small>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!esDueno && (
                    <button
                      type="button"
                      className="enlace-peligro"
                      disabled={accionEnCurso}
                      onClick={salirDelGrupo}
                    >
                      Salir del grupo
                    </button>
                  )}
                </section>

                <section className="card">
                  <h2>Invitación</h2>
                  {grupo.invitacionActiva ? (
                    <>
                      <p className="ayuda">Comparte este código o este enlace:</p>
                      <div className="codigo-invitacion">{grupo.codigoInvitacion}</div>
                      <input
                        className="input-enlace"
                        readOnly
                        aria-label="Enlace de invitación"
                        value={construirEnlaceInvitacion(grupo.codigoInvitacion)}
                        onFocus={(evento) => evento.target.select()}
                      />
                      <button
                        type="button"
                        className="boton boton-secundario boton-pequeno"
                        onClick={copiarEnlace}
                      >
                        {copiado ? '¡Copiado!' : 'Copiar enlace'}
                      </button>
                    </>
                  ) : (
                    <p className="ayuda">La invitación está desactivada.</p>
                  )}

                  {esDueno ? (
                    <div className="acciones-invitacion">
                      <button
                        type="button"
                        className="boton boton-secundario boton-pequeno"
                        disabled={accionEnCurso}
                        onClick={() =>
                          ejecutarAccion(async () => {
                            await regenerarCodigoInvitacion(grupo.id)
                          })
                        }
                      >
                        Generar código nuevo
                      </button>
                      <button
                        type="button"
                        className="enlace-peligro"
                        disabled={accionEnCurso}
                        onClick={() =>
                          ejecutarAccion(async () => {
                            await cambiarEstadoInvitacion(
                              grupo.id,
                              !grupo.invitacionActiva,
                            )
                          })
                        }
                      >
                        {grupo.invitacionActiva ? 'Desactivar invitación' : 'Activar invitación'}
                      </button>
                    </div>
                  ) : (
                    <p className="ayuda">Solo el dueño puede cambiar la invitación.</p>
                  )}
                </section>

                {esDueno && (
                  <section className="card">
                    <div className="cabecera-seccion">
                      <h2>Datos del grupo</h2>
                      {!editandoGrupo && (
                        <button
                          type="button"
                          className="enlace"
                          onClick={() => {
                            setNombre(grupo.nombre)
                            setDescripcion(grupo.descripcion)
                            setEditandoGrupo(true)
                          }}
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    {editandoGrupo && (
                      <form className="formulario" onSubmit={manejarGuardarGrupo}>
                        <div className="campo">
                          <label htmlFor="editar-nombre-grupo">Nombre</label>
                          <input
                            id="editar-nombre-grupo"
                            type="text"
                            value={nombre}
                            onChange={(evento) => setNombre(evento.target.value)}
                          />
                        </div>
                        <div className="campo">
                          <label htmlFor="editar-descripcion-grupo">Descripción</label>
                          <input
                            id="editar-descripcion-grupo"
                            type="text"
                            value={descripcion}
                            onChange={(evento) => setDescripcion(evento.target.value)}
                          />
                        </div>
                        <div className="acciones-formulario">
                          <button type="submit" className="boton boton-primario" disabled={accionEnCurso}>
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="boton boton-secundario"
                            onClick={() => setEditandoGrupo(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </main>
    </>
  )
}
