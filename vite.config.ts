import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages la app se sirve bajo /<nombre-del-repo>/.
// El workflow inyecta VITE_BASE_PATH con el nombre real del repositorio;
// en local (npm run dev) se usa '/' por defecto.
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
})
