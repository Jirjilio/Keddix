export default function App() {
  return (
    <main className="page">
      <header className="header">
        <div className="logo" aria-hidden="true">
          🎉
        </div>
        <div>
          <h1>Planes con amigos</h1>
          <p className="subtitle">Organiza quedadas con tu gente, sin complicaciones.</p>
        </div>
        <span className="badge">Fase 1 · Despliegue</span>
      </header>

      <section className="card">
        <h2>La base ya está montada</h2>
        <p>
          Esta primera versión solo comprueba que la aplicación compila y se publica
          automáticamente en GitHub Pages. A partir de aquí llegan los grupos, los planes,
          las invitaciones y el resto de funcionalidades.
        </p>
        <ul className="checklist">
          <li>React + Vite + TypeScript</li>
          <li>Compilación y tipos correctos</li>
          <li>Publicación automática con GitHub Actions</li>
        </ul>
      </section>
    </main>
  )
}
