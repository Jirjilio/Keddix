/**
 * Ficha completa de un plan: opciones de fecha, votos y administración.
 *
 * Permisos aplicados tanto en la interfaz como en firestore.rules:
 * - Cualquier miembro del grupo puede ver el plan y votar una opción.
 * - El creador y sus editores pueden editar el contenido y confirmar una fecha.
 * - Solo el creador puede cambiar la lista de editores o borrar el plan.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cabecera } from '../componentes/Cabecera'
import { BloqueError } from '../componentes/BloqueError'
import { IndicadorCarga } from '../componentes/IndicadorCarga'
import { FormularioPlan } from '../componentes/FormularioPlan'
import { usarAutenticacion } from '../autenticacion/AuthContext'
import { obtenerMiembros } from '../servicios/grupos'
import {
  actualizarPlan,
  cambiarEditores,
  confirmarOpcion,
  eliminarPlan,
  listarVotos,
  obtenerPlan,
  reabrirPlan,
  votarOpcion,
} from '../servicios/planes'
import { obtenerNombresPorUid } from '../servicios/usuarios'
import type { DatosFormularioPlan, Miembro, Plan, Voto } from '../types'
import {
  formatearOpcion,
  formatearPrecio,
  traducirErrorFirebase,
} from '../utilidades/formatos'
import { useDatosRemotos } from '../utilidades/useDatosRemotos'

/** Datos que necesita la ficha para pintarse por completo. */
interface DatosFichaPlan {
  plan: Plan | null
  votos: Voto[]
  miembros: Miembro[]
}

export function PaginaPlan() {
  const { grupoId = '', planId = '' } = useParams()
  const navegar = useNavigate()
  const { usuario } = usarAutenticacion()
  const uidActual = usuario?.uid ?? ''

  const { datos, cargando, error, recargar } = useDatosRemotos<DatosFichaPlan>(
    async () => {
      const [plan, votos, miembros] = await Promise.all([
        obtenerPlan(grupoId, planId),
        listarVotos(grupoId, planId),
        obtenerMiembros(grupoId),
      ])
      return { plan, votos, miembros }
    },
    `${grupoId}/${planId}`,
  )

  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [editando, setEditando] = useState(false)
  const [panelEditores, setPanelEditores] = useState(false)
  const [editoresSeleccionados, setEditoresSeleccionados] = useState<string[]>([])
  const [accionEnCurso, setAccionEnCurso] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  const plan = datos?.plan ?? null
  const votos = datos?.votos ?? []
  const miembros = datos?.miembros ?? []
  const esCreador = plan?.creadoPor === uidActual
  const puedeEditar = esCreador || (plan?.editores.includes(uidActual) ?? false)
  const miVoto = votos.find((voto) => voto.uid === uidActual)

  // Resolvemos los nombres de quienes aparecen como votantes o editores.
  // Se hace en un efecto aparte porque no es imprescindible para mostrar la
  // ficha: mientras tanto se muestra el uid acortado.
  useEffect(() => {
    if (datos === null) return
    const uids = [
      ...votos.map((voto) => voto.uid),
      ...(datos.plan?.editores ?? []),
    ]
    obtenerNombresPorUid(uids)
      .then(setNombres)
      .catch(() => {
        // Si falla la consulta de perfiles no bloqueamos la ficha del plan.
      })
  }, [datos])

  /** Envuelve una acción para gestionar carga, errores y recarga posterior. */
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

  async function manejarVoto(opcionId: string): Promise<void> {
    await ejecutarAccion(async () => {
      await votarOpcion(grupoId, planId, opcionId)
    })
  }

  async function manejarGuardar(datosFormulario: DatosFormularioPlan): Promise<void> {
    await ejecutarAccion(async () => {
      await actualizarPlan(grupoId, planId, datosFormulario)
      setEditando(false)
    })
  }

  async function manejarConfirmar(opcionId: string): Promise<void> {
    await ejecutarAccion(async () => {
      await confirmarOpcion(grupoId, planId, opcionId)
    })
  }

  async function manejarBorrar(): Promise<void> {
    // confirm() es suficiente para una acción destructiva de esta app pequeña.
    if (!window.confirm('¿Borrar este plan? No se podrá recuperar.')) return
    await ejecutarAccion(async () => {
      await eliminarPlan(grupoId, planId)
      navegar(`/grupos/${grupoId}`, { replace: true })
    })
  }

  function alternarEditor(uid: string): void {
    setEditoresSeleccionados((anteriores) =>
      anteriores.includes(uid)
        ? anteriores.filter((valor) => valor !== uid)
        : [...anteriores, uid],
    )
  }

  async function guardarEditores(): Promise<void> {
    await ejecutarAccion(async () => {
      await cambiarEditores(grupoId, planId, editoresSeleccionados)
      setPanelEditores(false)
    })
  }

  return (
    <>
      <Cabecera />
      <main className="pagina pagina-estrecha">
        <Link to={`/grupos/${grupoId}`} className="enlace-volver">← Volver al grupo</Link>

        {cargando && <IndicadorCarga mensaje="Abriendo el plan…" />}
        {!cargando && error !== null && <BloqueError mensaje={error} alReintentar={recargar} />}

        {!cargando && error === null && plan === null && (
          <section className="card estado">
            <h1>Plan no disponible</h1>
            <p>No encontramos este plan o ya no tienes acceso a él.</p>
          </section>
        )}

        {!cargando && error === null && plan !== null && datos !== null && (
          <>
            {errorAccion !== null && <BloqueError mensaje={errorAccion} />}

            <section className="card cabecera-plan">
              <div className="etiquetas-plan">
                <span className={plan.estado === 'confirmada' ? 'etiqueta etiqueta-verde' : 'etiqueta'}>
                  {plan.estado === 'confirmada' ? '✅ Confirmado' : '🗳️ En votación'}
                </span>
                {plan.precio !== null && (
                  <span className="etiqueta etiqueta-precio">
                    {formatearPrecio(plan.precio, plan.moneda)}
                  </span>
                )}
              </div>
              <h1>{plan.titulo}</h1>
              <p className="descripcion-plan">{plan.descripcion || 'Sin descripción'}</p>
              <p className="autoria">
                Propuesto por {nombres[plan.creadoPor] ?? 'un compañero'}
              </p>

              {puedeEditar && (
                <div className="botones-titulo">
                  {plan.estado === 'confirmada' ? (
                    <button
                      type="button"
                      className="boton boton-secundario"
                      disabled={accionEnCurso}
                      onClick={() => ejecutarAccion(() => reabrirPlan(grupoId, planId))}
                    >
                      Volver a votación
                    </button>
                  ) : null}
                  {!editando && (
                    <button
                      type="button"
                      className="boton boton-secundario"
                      onClick={() => setEditando(true)}
                    >
                      Editar plan
                    </button>
                  )}
                  {esCreador && (
                    <button
                      type="button"
                      className="boton boton-peligro"
                      disabled={accionEnCurso}
                      onClick={manejarBorrar}
                    >
                      Borrar
                    </button>
                  )}
                </div>
              )}
            </section>

            {editando ? (
              <section className="card">
                <h2>Editar plan</h2>
                <FormularioPlan
                  planExistente={plan}
                  alGuardar={manejarGuardar}
                  textoBoton="Guardar cambios"
                />
                <button
                  type="button"
                  className="enlace"
                  onClick={() => setEditando(false)}
                >
                  Cancelar edición
                </button>
              </section>
            ) : (
              <section className="card">
                <div className="cabecera-seccion">
                  <h2>Opciones de fecha</h2>
                  {plan.estado === 'propuesta' && (
                    <span className="ayuda-inline">Toca una opción para votarla</span>
                  )}
                </div>

                <div className="lista-opciones">
                  {plan.opciones.map((opcion) => {
                    const votosOpcion = votos.filter((voto) => voto.opcionId === opcion.id)
                    const esMiVoto = miVoto?.opcionId === opcion.id
                    const esConfirmada = plan.opcionConfirmadaId === opcion.id

                    return (
                      <div
                        key={opcion.id}
                        className={
                          esConfirmada
                            ? 'opcion opcion-confirmada'
                            : esMiVoto
                              ? 'opcion opcion-elegida'
                              : 'opcion'
                        }
                      >
                        <button
                          type="button"
                          className="opcion-boton"
                          disabled={accionEnCurso || plan.estado === 'confirmada'}
                          onClick={() => manejarVoto(opcion.id)}
                        >
                          <span className="opcion-radio" aria-hidden="true">
                            {esMiVoto ? '●' : '○'}
                          </span>
                          <span className="opcion-texto">
                            <strong>{formatearOpcion(opcion)}</strong>
                            <small>
                              {votosOpcion.length}{' '}
                              {votosOpcion.length === 1 ? 'voto' : 'votos'}
                              {esConfirmada ? ' · fecha elegida' : ''}
                            </small>
                          </span>
                        </button>

                        {votosOpcion.length > 0 && (
                          <div className="votantes">
                            {votosOpcion.map((voto) => (
                              <span key={voto.uid} className=" chip-votante">
                                {nombres[voto.uid] ?? voto.uid.slice(0, 6)}
                              </span>
                            ))}
                          </div>
                        )}

                        {puedeEditar && plan.estado === 'propuesta' && (
                          <button
                            type="button"
                            className="enlace"
                            disabled={accionEnCurso}
                            onClick={() => manejarConfirmar(opcion.id)}
                          >
                            Confirmar esta fecha
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="card">
              <div className="cabecera-seccion">
                <h2>Editores del plan</h2>
                {esCreador && !panelEditores && (
                  <button
                    type="button"
                    className="enlace"
                    onClick={() => {
                      setEditoresSeleccionados(plan.editores)
                      setPanelEditores(true)
                    }}
                  >
                    Gestionar
                  </button>
                )}
              </div>

              {plan.editores.length === 0 && !panelEditores && (
                <p className="ayuda">Solo el creador puede editar este plan.</p>
              )}
              {plan.editores.length > 0 && !panelEditores && (
                <p>
                  También pueden editar:{' '}
                  {plan.editores.map((uid) => nombres[uid] ?? uid.slice(0, 6)).join(', ')}
                </p>
              )}

              {panelEditores && (
                <div className="lista-editores">
                  <p className="ayuda">Marca a los compañeros que podrán editar este plan:</p>
                  {miembros
                    .filter((miembro) => miembro.uid !== plan.creadoPor)
                    .map((miembro) => (
                      <label key={miembro.uid} className="casilla">
                        <input
                          type="checkbox"
                          checked={editoresSeleccionados.includes(miembro.uid)}
                          onChange={() => alternarEditor(miembro.uid)}
                        />
                        {miembro.nombreVisible}
                      </label>
                    ))}
                  <div className="acciones-formulario">
                    <button
                      type="button"
                      className="boton boton-primario"
                      disabled={accionEnCurso}
                      onClick={guardarEditores}
                    >
                      Guardar editores
                    </button>
                    <button
                      type="button"
                      className="boton boton-secundario"
                      onClick={() => setPanelEditores(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
