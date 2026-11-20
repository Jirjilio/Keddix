/** Pantalla genérica para rutas que no existen. */

import { Link } from 'react-router-dom'

export function PaginaNoEncontrada() {
  return (
    <main className="pantalla-centrada">
      <section className="card estado">
        <span aria-hidden="true">🧭</span>
        <h1>Página no encontrada</h1>
        <p>La dirección a la que has venido no existe.</p>
        <Link to="/grupos" className="boton boton-primario">Ir a mis grupos</Link>
      </section>
    </main>
  )
}
