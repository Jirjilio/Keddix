/**
 * Pantalla de acceso: entrada, registro y recuperación de contraseña.
 *
 * Se puede entrar con el correo o con el nombre de usuario (con o sin @).
 * El contexto de autenticación se encarga de resolver "@usuario" a correo.
 */

import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { usarAutenticacion } from '../autenticacion/AuthContext'
import { traducirErrorFirebase } from '../utilidades/formatos'

/** Los tres estados por los que puede pasar esta pantalla. */
type Modo = 'entrar' | 'registrarse' | 'recuperar'

export function PaginaEntrar() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  // Si venimos de un enlace de invitación, volvemos allí después de entrar.
  const destinoTrasEntrar = parametros.get('redirigir') ?? '/grupos'
  const { usuario, cargando, iniciarSesion, registrarUsuario, enviarCorreoRecuperacion } =
    usarAutenticacion()

  const [modo, setModo] = useState<Modo>('entrar')
  const [identificador, setIdentificador] = useState('')
  const [correo, setCorreo] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [repetirContrasena, setRepetirContrasena] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Mientras Firebase comprueba si hay una sesión guardada mostramos el cargador.
  if (cargando) {
    return <div className="pantalla-centrada"><p>Comprobando tu sesión…</p></div>
  }

  // Si ya está identificado, no tiene sentido mostrar el formulario.
  if (usuario !== null) {
    return <Navigate to="/grupos" replace />
  }

  function cambiarModo(nuevoModo: Modo): void {
    setModo(nuevoModo)
    setError(null)
    setAviso(null)
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError(null)
    setAviso(null)
    setProcesando(true)

    try {
      if (modo === 'entrar') {
        await iniciarSesion(identificador, contrasena)
        navegar(destinoTrasEntrar, { replace: true })
      } else if (modo === 'registrarse') {
        if (contrasena !== repetirContrasena) {
          throw new Error('Las contraseñas no coinciden.')
        }
        await registrarUsuario(correo, nombreUsuario, contrasena)
        navegar(destinoTrasEntrar, { replace: true })
      } else {
        await enviarCorreoRecuperacion(correo)
        setAviso('Te hemos enviado un correo para restablecer la contraseña.')
      }
    } catch (errorReal) {
      setError(traducirErrorFirebase(errorReal))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <main className="pantalla-autenticacion">
      <section className="tarjeta-autenticacion">
        <div className="marca-grande">
          <span aria-hidden="true">🎉</span>
          <h1>Keddix</h1>
          <p>Organiza quedadas con tu gente, sin complicaciones.</p>
        </div>

        <div className="pestanas" role="tablist" aria-label="Acceso">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'entrar'}
            className={modo === 'entrar' ? 'pestana activa' : 'pestana'}
            onClick={() => cambiarModo('entrar')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'registrarse'}
            className={modo === 'registrarse' ? 'pestana activa' : 'pestana'}
            onClick={() => cambiarModo('registrarse')}
          >
            Crear cuenta
          </button>
        </div>

        <form className="formulario" onSubmit={manejarEnvio}>
          {modo === 'entrar' && (
            <>
              <div className="campo">
                <label htmlFor="identificador">Correo o usuario</label>
                <input
                  id="identificador"
                  type="text"
                  autoComplete="username"
                  value={identificador}
                  placeholder="juan@correo.com o @juan"
                  onChange={(evento) => setIdentificador(evento.target.value)}
                />
              </div>
              <div className="campo">
                <label htmlFor="contrasena-entrar">Contraseña</label>
                <input
                  id="contrasena-entrar"
                  type="password"
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(evento) => setContrasena(evento.target.value)}
                />
              </div>
              <button
                type="button"
                className="enlace"
                onClick={() => cambiarModo('recuperar')}
              >
                ¿Has olvidado tu contraseña?
              </button>
            </>
          )}

          {modo === 'registrarse' && (
            <>
              <div className="campo">
                <label htmlFor="usuario-nuevo">Nombre de usuario</label>
                <input
                  id="usuario-nuevo"
                  type="text"
                  autoComplete="username"
                  value={nombreUsuario}
                  placeholder="juan (3–20 letras, números, . _ -)"
                  onChange={(evento) => setNombreUsuario(evento.target.value)}
                />
                <p className="ayuda">Será tu nombre visible y te servirá para entrar con @usuario.</p>
              </div>
              <div className="campo">
                <label htmlFor="correo-nuevo">Correo electrónico</label>
                <input
                  id="correo-nuevo"
                  type="email"
                  autoComplete="email"
                  value={correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                />
              </div>
              <div className="fila-campos">
                <div className="campo">
                  <label htmlFor="contrasena-nueva">Contraseña</label>
                  <input
                    id="contrasena-nueva"
                    type="password"
                    autoComplete="new-password"
                    value={contrasena}
                    onChange={(evento) => setContrasena(evento.target.value)}
                  />
                </div>
                <div className="campo">
                  <label htmlFor="contrasena-repetida">Repítela</label>
                  <input
                    id="contrasena-repetida"
                    type="password"
                    autoComplete="new-password"
                    value={repetirContrasena}
                    onChange={(evento) => setRepetirContrasena(evento.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {modo === 'recuperar' && (
            <>
              <h2>Recuperar contraseña</h2>
              <p className="ayuda">Escribe el correo de tu cuenta y te enviaremos un enlace.</p>
              <div className="campo">
                <label htmlFor="correo-recuperar">Correo electrónico</label>
                <input
                  id="correo-recuperar"
                  type="email"
                  value={correo}
                  onChange={(evento) => setCorreo(evento.target.value)}
                />
              </div>
            </>
          )}

          {error !== null && <p className="error-formulario" role="alert">{error}</p>}
          {aviso !== null && <p className="aviso" role="status">{aviso}</p>}

          <button type="submit" className="boton boton-primario boton-ancho" disabled={procesando}>
            {procesando
              ? 'Un momento…'
              : modo === 'entrar'
                ? 'Entrar'
                : modo === 'registrarse'
                  ? 'Crear cuenta'
                  : 'Enviar enlace'}
          </button>

          {modo === 'recuperar' && (
            <button
              type="button"
              className="enlace"
              onClick={() => cambiarModo('entrar')}
            >
              Volver a entrar
            </button>
          )}
        </form>
      </section>
    </main>
  )
}
