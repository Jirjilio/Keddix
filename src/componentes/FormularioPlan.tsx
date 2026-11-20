/**
 * Formulario para crear o editar un plan.
 *
 * Un plan puede tener una o VARIAS opciones de fecha. Cada opción consta de:
 * - fecha de inicio (obligatoria),
 * - fecha de fin (opcional; solo para planes de varios días),
 * - hora de inicio (obligatoria).
 *
 * El componente es "controlado": el valor de cada input vive en el estado de
 * React y se actualiza en cada pulsación. Así podemos validar y enviar todo el
 * conjunto de una vez al pulsar "Guardar".
 */

import { useState, type FormEvent } from 'react'
import type { DatosFormularioPlan, OpcionFecha, Plan } from '../types'
import { traducirErrorFirebase } from '../utilidades/formatos'

/** Crea una opción vacía con un id vacío (el servicio le asignará uno nuevo). */
function crearOpcionVacia(): OpcionFecha {
  return {
    id: '',
    fechaInicio: '',
    fechaFin: null,
    horaInicio: '19:00',
  }
}

interface PropiedadesFormularioPlan {
  /** Si se pasa, el formulario se rellena con los datos de ese plan. */
  planExistente?: Plan
  /** Función que recibe los datos válidos y los guarda en Firestore. */
  alGuardar: (datos: DatosFormularioPlan) => Promise<void>
  /** Texto del botón principal: "Crear plan" o "Guardar cambios". */
  textoBoton: string
}

export function FormularioPlan({
  planExistente,
  alGuardar,
  textoBoton,
}: PropiedadesFormularioPlan) {
  const [titulo, setTitulo] = useState(planExistente?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(planExistente?.descripcion ?? '')
  const [precioTexto, setPrecioTexto] = useState(
    planExistente?.precio === null || planExistente === undefined
      ? ''
      : String(planExistente.precio),
  )
  const [moneda, setMoneda] = useState(planExistente?.moneda ?? 'EUR')
  const [opciones, setOpciones] = useState<OpcionFecha[]>(
    planExistente?.opciones.map((opcion) => ({ ...opcion })) ?? [crearOpcionVacia()],
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Actualiza una opción concreta por su posición en el array. */
  function cambiarOpcion(indice: number, cambios: Partial<OpcionFecha>): void {
    setOpciones((anteriores) =>
      anteriores.map((opcion, indiceActual) =>
        indiceActual === indice ? { ...opcion, ...cambios } : opcion,
      ),
    )
  }

  function anyadirOpcion(): void {
    setOpciones((anteriores) => [...anteriores, crearOpcionVacia()])
  }

  function quitarOpcion(indice: number): void {
    // Siempre dejamos al menos una opción: un plan sin fechas no tendría sentido.
    setOpciones((anteriores) =>
      anteriores.length === 1 ? anteriores : anteriores.filter((_, i) => i !== indice),
    )
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError(null)

    if (titulo.trim().length === 0) {
      setError('Ponle un título al plan.')
      return
    }

    for (const [indice, opcion] of opciones.entries()) {
      if (opcion.fechaInicio.length === 0 || opcion.horaInicio.length === 0) {
        setError(`La opción ${indice + 1} necesita fecha y hora.`)
        return
      }
      // Un rango de fechas no puede terminar antes de empezar.
      if (
        opcion.fechaFin !== null &&
        opcion.fechaFin.length > 0 &&
        opcion.fechaFin < opcion.fechaInicio
      ) {
        setError(`En la opción ${indice + 1}, la fecha de fin no puede ser anterior.`)
        return
      }
    }

    const precio = precioTexto.trim().length === 0 ? null : Number(precioTexto)
    if (precio !== null && (Number.isNaN(precio) || precio < 0)) {
      setError('El precio debe ser un número positivo o dejarlo vacío.')
      return
    }

    setGuardando(true)
    try {
      await alGuardar({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        precio,
        moneda,
        opciones: opciones.map((opcion) => ({
          ...opcion,
          // Normalizamos el campo opcional: cadena vacía equivale a "no hay fin".
          fechaFin:
            opcion.fechaFin === null || opcion.fechaFin.length === 0
              ? null
              : opcion.fechaFin,
        })),
      })
    } catch (errorReal) {
      setError(traducirErrorFirebase(errorReal))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={manejarEnvio}>
      <div className="campo">
        <label htmlFor="titulo-plan">Título del plan</label>
        <input
          id="titulo-plan"
          type="text"
          value={titulo}
          maxLength={100}
          placeholder="Escapada a la playa"
          onChange={(evento) => setTitulo(evento.target.value)}
        />
      </div>

      <div className="campo">
        <label htmlFor="descripcion-plan">Descripción</label>
        <textarea
          id="descripcion-plan"
          rows={5}
          value={descripcion}
          placeholder="Cuéntales de qué se trata: dónde quedamos, qué haremos, qué llevamos…"
          onChange={(evento) => setDescripcion(evento.target.value)}
        />
      </div>

      <div className="fila-campos">
        <div className="campo">
          <label htmlFor="precio-plan">Precio por persona (opcional)</label>
          <input
            id="precio-plan"
            type="number"
            min="0"
            step="0.01"
            value={precioTexto}
            placeholder="Dejar vacío si es gratis"
            onChange={(evento) => setPrecioTexto(evento.target.value)}
          />
        </div>
        <div className="campo campo-corto">
          <label htmlFor="moneda-plan">Moneda</label>
          <select
            id="moneda-plan"
            value={moneda}
            onChange={(evento) => setMoneda(evento.target.value)}
          >
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
            <option value="GBP">GBP £</option>
          </select>
        </div>
      </div>

      <fieldset className="grupo-opciones">
        <legend>Opciones de fecha y hora</legend>
        <p className="ayuda">
          Añade varias si aún no habéis decidido el día. Después se votará la que
          prefiera el grupo.
        </p>

        {opciones.map((opcion, indice) => (
          <div className="tarjeta-opcion" key={indice}>
            <div className="cabecera-opcion">
              <strong>Opción {indice + 1}</strong>
              {opciones.length > 1 && (
                <button
                  type="button"
                  className="enlace-peligro"
                  onClick={() => quitarOpcion(indice)}
                >
                  Quitar
                </button>
              )}
            </div>

            <div className="fila-campos">
              <div className="campo">
                <label htmlFor={`fecha-inicio-${indice}`}>Día de inicio</label>
                <input
                  id={`fecha-inicio-${indice}`}
                  type="date"
                  required
                  value={opcion.fechaInicio}
                  onChange={(evento) =>
                    cambiarOpcion(indice, { fechaInicio: evento.target.value })
                  }
                />
              </div>
              <div className="campo">
                <label htmlFor={`fecha-fin-${indice}`}>
                  Día de fin <span className="ayuda-inline">(opcional)</span>
                </label>
                <input
                  id={`fecha-fin-${indice}`}
                  type="date"
                  value={opcion.fechaFin ?? ''}
                  onChange={(evento) =>
                    cambiarOpcion(indice, { fechaFin: evento.target.value })
                  }
                />
              </div>
              <div className="campo campo-corto">
                <label htmlFor={`hora-inicio-${indice}`}>Hora</label>
                <input
                  id={`hora-inicio-${indice}`}
                  type="time"
                  required
                  value={opcion.horaInicio}
                  onChange={(evento) =>
                    cambiarOpcion(indice, { horaInicio: evento.target.value })
                  }
                />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="boton boton-secundario" onClick={anyadirOpcion}>
          + Añadir otra fecha
        </button>
      </fieldset>

      {error !== null && <p className="error-formulario" role="alert">{error}</p>}

      <div className="acciones-formulario">
        <button type="submit" className="boton boton-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : textoBoton}
        </button>
      </div>
    </form>
  )
}
