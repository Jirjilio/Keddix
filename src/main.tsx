/**
 * Punto de entrada de la aplicación.
 *
 * Vite lee index.html, encuentra este script y lo ejecuta en el navegador.
 * React "monta" el componente App dentro del div#root del HTML.
 *
 * El registro del service worker (PWA) lo inyecta automáticamente
 * vite-plugin-pwa durante la compilación, gracias a registerType: 'autoUpdate'
 * en vite.config.ts. No hace falta escribir código extra aquí.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './estilos.css'

const elementoRaiz = document.getElementById('root')

if (elementoRaiz === null) {
  throw new Error('No se encontró el elemento #root en index.html')
}

createRoot(elementoRaiz).render(
  // StrictMode ejecuta comprobaciones extra solo en desarrollo para detectar
  // efectos mal limpiados. En producción no añade coste.
  <StrictMode>
    <App />
  </StrictMode>,
)
