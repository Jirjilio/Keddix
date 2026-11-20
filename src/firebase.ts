/**
 * Configuración centralizada de Firebase.
 *
 * Estos valores NO son secretos: Firebase los expone en el navegador por
 * diseño. La protección real está en firestore.rules, no en ocultarlos.
 * Se leen de variables de entorno VITE_* definidas en un archivo .env.local
 * que NO se sube a GitHub (está en .gitignore).
 */

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

/** Valores leídos del entorno, tal como los escribió el usuario. */
const valoresEntorno = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * True solo si las seis variables están rellenas. App.tsx lo usa para mostrar
 * una pantalla de ayuda en lugar de dejar errores crípticos en consola.
 */
export const firebaseConfigurado = Object.values(valoresEntorno).every(
  (valor) => typeof valor === 'string' && valor.trim().length > 0,
)

/**
 * Si falta .env.local usamos textos de relleno únicamente para que
 * initializeApp() no lance una excepción al cargar el módulo. La app no
 * intentará conectarse porque App.tsx mostrará antes el aviso de configuración.
 */
const configuracion = {
  apiKey: valoresEntorno.apiKey || 'sin-configurar',
  authDomain: valoresEntorno.authDomain || 'sin-configurar.firebaseapp.com',
  projectId: valoresEntorno.projectId || 'sin-configurar',
  storageBucket: valoresEntorno.storageBucket || 'sin-configurar.appspot.com',
  messagingSenderId: valoresEntorno.messagingSenderId || '000000000000',
  appId: valoresEntorno.appId || '1:000000000000:web:0000000000000000000000',
}

/** Una sola instancia de la app Firebase para todo el proyecto. */
const aplicacionFirebase = initializeApp(configuracion)

/** Autenticación: gestiona registro, entrada, salida y sesión persistida. */
export const autenticacion = getAuth(aplicacionFirebase)

/** Base de datos de documentos: grupos, planes, votos e invitaciones. */
export const baseDeDatos = getFirestore(aplicacionFirebase)
