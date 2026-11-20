/**
 * Tarjeta-resumen de un plan dentro de la lista de un grupo.
 * Al pulsarla se abre la ficha completa con fechas, votos y permisos.
 */

import { Link } from 'react-router-dom'
import type { Plan } from '../types'
import { formatearOpcion, formatearPrecio } from '../utilidades/formatos'

interface PropiedadesTarjetaPlan {
  grupoId: string
  plan: Plan
}

export function TarjetaPlan({ grupoId, plan }: PropiedadesTarjetaPlan) {
  const primeraOpcion = plan.opciones[0]
  const esConfirmada = plan.estado === 'confirmada'
  const opcionConfirmada = plan.opciones.find(
    (opcion) => opcion.id === plan.opcionConfirmadaId,
  )

  return (
    <Link to={`/grupos/${grupoId}/planes/${plan.id}`} className="tarjeta-plan">
      <div className="etiquetas-plan">
        <span className={esConfirmada ? 'etiqueta etiqueta-verde' : 'etiqueta'}>
          {esConfirmada ? '✅ Confirmado' : '🗳️ En votación'}
        </span>
        {plan.precio !== null && (
          <span className="etiqueta etiqueta-precio">
            {formatearPrecio(plan.precio, plan.moneda)}
          </span>
        )}
      </div>

      <h3>{plan.titulo}</h3>
      <p className="recorte-texto">
        {plan.descripcion || 'Sin descripción'}
      </p>

      <div className="resumen-fechas">
        <span aria-hidden="true">📅</span>
        <span>
          {esConfirmada && opcionConfirmada !== undefined
            ? formatearOpcion(opcionConfirmada)
            : plan.opciones.length === 1 && primeraOpcion !== undefined
              ? formatearOpcion(primeraOpcion)
              : `${plan.opciones.length} opciones de fecha`}
        </span>
      </div>
    </Link>
  )
}
