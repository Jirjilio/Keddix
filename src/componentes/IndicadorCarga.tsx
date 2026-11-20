/** Pequeño componente para mostrar que estamos esperando datos de Firestore. */

interface PropiedadesIndicadorCarga {
  /** Texto opcional; por defecto decimos algo genérico en español. */
  mensaje?: string
}

export function IndicadorCarga({
  mensaje = 'Cargando…',
}: PropiedadesIndicadorCarga) {
  return (
    <div className="estado" role="status" aria-live="polite">
      <div className="ruleta" aria-hidden="true" />
      <p>{mensaje}</p>
    </div>
  )
}
