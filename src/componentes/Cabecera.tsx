/**
 * Cabecera común de la aplicación autenticada.
 *
 * Muestra el nombre de la app, el usuario entrado y el botón de salida.
 * En móvil se apila verticalmente; en escritorio se alinea en una fila
 * (ver estilos.css, media query de 720px).
 */

import { Link, useNavigate } from 'react-router-dom'
import { usarAutenticacion } from '../autenticacion/AuthContext'
import { traducirErrorFirebase } from '../utilidades/formatos'

export function Cabecera() {
  // useNavigate nos permite redirigir después de cerrar sesión.
  const navegar = useNavigate()
  const { usuario, cerrarSesion } = usarAutenticacion()

  async function manejarSalida(): Promise<void> {
    try {
      await cerrarSesion()
      navegar('/entrar', { replace: true })
    } catch (error) {
      // No hacemos nada destructivo: mostramos el motivo por consola y el
      // usuario seguirá en su sesión para poder volver a intentarlo.
      console.error(traducirErrorFirebase(error))
    }
  }

  const nombreMostrado = usuario?.displayName ?? usuario?.email ?? 'Invitado'

  return (
    <header className="cabecera">
      <Link to="/grupos" className="marca" aria-label="Ir a mis grupos">
        <span className="marca-icono" aria-hidden="true">🎉</span>
        <span>
          <strong>Keddix</strong>
          <small>Planes con amigos</small>
        </span>
      </Link>

      <div className="cabecera-derecha">
        <span className="usuario-actual" title={usuario?.email ?? ''}>
          {nombreMostrado}
        </span>
        <button
          type="button"
          className="boton boton-secundario boton-pequeno"
          onClick={manejarSalida}
        >
          Salir
        </button>
      </div>
    </header>
  )
}
