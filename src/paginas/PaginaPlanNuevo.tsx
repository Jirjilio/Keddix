/**
 * Página para proponer un plan nuevo en un grupo.
 * Cualquier miembro del grupo puede crear planes (lo permiten las reglas).
 */

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cabecera } from '../componentes/Cabecera'
import { BloqueError } from '../componentes/BloqueError'
import { FormularioPlan } from '../componentes/FormularioPlan'
import { crearPlan } from '../servicios/planes'
import type { DatosFormularioPlan } from '../types'
import { traducirErrorFirebase } from '../utilidades/formatos'

export function PaginaPlanNuevo() {
  const { grupoId = '' } = useParams()
  const navegar = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function manejarCrear(datos: DatosFormularioPlan): Promise<void> {
    setError(null)
    try {
      const planId = await crearPlan(grupoId, datos)
      navegar(`/grupos/${grupoId}/planes/${planId}`, { replace: true })
    } catch (errorReal) {
      setError(traducirErrorFirebase(errorReal))
    }
  }

  return (
    <>
      <Cabecera />
      <main className="pagina pagina-estrecha">
        <Link to={`/grupos/${grupoId}`} className="enlace-volver">← Volver al grupo</Link>
        <h1>Proponer un plan</h1>
        <p className="subtitulo">
          Añade una o varias fechas. El grupo podrá votar la que más le convenga.
        </p>
        {error !== null && <BloqueError mensaje={error} />}
        <section className="card">
          <FormularioPlan alGuardar={manejarCrear} textoBoton="Crear plan" />
        </section>
      </main>
    </>
  )
}
