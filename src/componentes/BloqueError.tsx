/**
 * Bloque de error con botón de reintento.
 * Se usa tanto para errores de red como para permisos denegados.
 */

interface PropiedadesBloqueError {
  mensaje: string
  /** Función que vuelve a intentar la operación que falló. */
  alReintentar?: () => void
}

export function BloqueError({
  mensaje,
  alReintentar,
}: PropiedadesBloqueError) {
  return (
    <div className="estado estado-error" role="alert">
      <span aria-hidden="true">⚠️</span>
      <p>{mensaje}</p>
      {alReintentar !== undefined && (
        <button type="button" className="boton boton-secundario" onClick={alReintentar}>
          Reintentar
        </button>
      )}
    </div>
  )
}
