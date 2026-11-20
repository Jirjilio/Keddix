/**
 * Componente raíz de la aplicación.
 *
 * Configura tres cosas:
 * 1. El proveedor de autenticación (para que todas las pantallas sepan quién
 *    ha entrado).
 * 2. El enrutador. Usamos HashRouter porque GitHub Pages es alojamiento
 *    estático: las rutas van después de '#' (#/grupos, #/entrar…) y así el
 *    servidor nunca intenta buscar archivos que no existen.
 * 3. Las rutas y su protección: las pantallas de grupos exigen sesión.
 */

import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProveedorAutenticacion, usarAutenticacion } from './autenticacion/AuthContext'
import { firebaseConfigurado } from './firebase'
import { PaginaEntrar } from './paginas/PaginaEntrar'
import { PaginaGrupo } from './paginas/PaginaGrupo'
import { PaginaGrupos } from './paginas/PaginaGrupos'
import { PaginaNoEncontrada } from './paginas/PaginaNoEncontrada'
import { PaginaPlan } from './paginas/PaginaPlan'
import { PaginaPlanNuevo } from './paginas/PaginaPlanNuevo'
import { PaginaUnirse } from './paginas/PaginaUnirse'

/**
 * Envuelve las rutas privadas. Mientras Firebase comprueba la sesión guardada
 * mostramos un texto breve; si no hay sesión mandamos a la pantalla de entrada.
 */
function RutaPrivada({ children }: { children: ReactNode }) {
  const { usuario, cargando } = usarAutenticacion()

  if (cargando) {
    return <div className="pantalla-centrada"><p>Comprobando tu sesión…</p></div>
  }
  if (usuario === null) {
    return <Navigate to="/entrar" replace />
  }
  return <>{children}</>
}

/**
 * Se muestra solo si faltan las variables de entorno de Firebase.
 * Es mejor que un error en consola: explica exactamente qué hay que hacer.
 */
function AvisoConfiguracion() {
  return (
    <main className="pantalla-centrada">
      <section className="card aviso-configuracion">
        <h1>Falta configurar Firebase</h1>
        <p>
          Para desarrollar en local, copia <code>.env.example</code> a{' '}
          <code>.env.local</code> y rellena los seis valores con los de tu
          proyecto Firebase (Consola → Configuración del proyecto → Tus apps).
        </p>
        <p>Después, reinicia <code>npm run dev</code>.</p>
        <p className="ayuda">
          Recuerda activar Authentication (método Correo/contraseña) y crear la
          base de datos Firestore con las reglas del archivo{' '}
          <code>firestore.rules</code>.
        </p>
      </section>
    </main>
  )
}

function Rutas() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/grupos" replace />} />
      <Route path="/entrar" element={<PaginaEntrar />} />

      <Route
        path="/unirse"
        element={
          <RutaPrivada>
            <PaginaUnirse />
          </RutaPrivada>
        }
      />
      <Route
        path="/grupos"
        element={
          <RutaPrivada>
            <PaginaGrupos />
          </RutaPrivada>
        }
      />
      <Route
        path="/grupos/:grupoId"
        element={
          <RutaPrivada>
            <PaginaGrupo />
          </RutaPrivada>
        }
      />
      <Route
        path="/grupos/:grupoId/planes/nuevo"
        element={
          <RutaPrivada>
            <PaginaPlanNuevo />
          </RutaPrivada>
        }
      />
      <Route
        path="/grupos/:grupoId/planes/:planId"
        element={
          <RutaPrivada>
            <PaginaPlan />
          </RutaPrivada>
        }
      />
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  )
}

export default function App() {
  if (!firebaseConfigurado) {
    return <AvisoConfiguracion />
  }

  return (
    <ProveedorAutenticacion>
      <HashRouter>
        <Rutas />
      </HashRouter>
    </ProveedorAutenticacion>
  )
}
