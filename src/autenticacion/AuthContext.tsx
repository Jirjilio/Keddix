/**
 * Contexto de autenticación.
 *
 * React Context permite que cualquier pantalla acceda al usuario actual y a
 * las acciones de registro/entrada sin pasar props de uno en uno.
 * Firebase guarda la sesión en el dispositivo (IndexedDB), por lo que al
 * volver a abrir la PWA no hace falta volver a escribir la contraseña.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { autenticacion, baseDeDatos } from '../firebase'
import type { Usuario } from '../types'
import {
  normalizarNombreUsuario,
  traducirErrorFirebase,
} from '../utilidades/formatos'

/** Forma del objeto que ofrecemos a las pantallas. */
interface ContextoAutenticacion {
  usuario: User | null
  cargando: boolean
  registrarUsuario: (
    correo: string,
    nombreUsuario: string,
    nombreVisible: string,
    contrasena: string,
  ) => Promise<void>
  iniciarSesion: (identificador: string, contrasena: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  enviarCorreoRecuperacion: (correo: string) => Promise<void>
}

const Contexto = createContext<ContextoAutenticacion | null>(null)

/** Hook de conveniencia: lanza un error claro si se usa fuera del provider. */
export function usarAutenticacion(): ContextoAutenticacion {
  const contexto = useContext(Contexto)
  if (contexto === null) {
    throw new Error('usarAutenticacion debe usarse dentro de ProveedorAutenticacion')
  }
  return contexto
}

export function ProveedorAutenticacion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [cargando, setCargando] = useState(true)

  // Escuchamos cambios de sesión: entrada, salida y restauración al recargar.
  useEffect(() => {
    const dejarDeEscuchar = onAuthStateChanged(autenticacion, (usuarioActual) => {
      setUsuario(usuarioActual)
      setCargando(false)
    })
    return dejarDeEscuchar
  }, [])

  /**
   * Crea la cuenta en Firebase Auth y, a continuación, sus dos documentos en
   * Firestore: el perfil (users) y la tabla de búsqueda por @usuario.
   */
  async function registrarUsuario(
    correo: string,
    nombreUsuario: string,
    nombreVisible: string,
    contrasena: string,
  ): Promise<void> {
    const normalizado = normalizarNombreUsuario(nombreUsuario)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      throw new Error('Escribe un correo electrónico válido.')
    }
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(normalizado)) {
      throw new Error('El usuario debe tener entre 3 y 20 letras, números, punto, guion o guion bajo.')
    }

    // El id del documento es el usuario normalizado: eso garantiza unicidad.
    const referenciaNombre = doc(baseDeDatos, 'usernames', normalizado)
    if ((await getDoc(referenciaNombre)).exists()) {
      throw new Error('Ese nombre de usuario ya está ocupado.')
    }

    let usuarioCreado: User | null = null
    try {
      const credencial = await createUserWithEmailAndPassword(
        autenticacion,
        correo.trim().toLowerCase(),
        contrasena,
      )
      usuarioCreado = credencial.user
      await updateProfile(usuarioCreado, { displayName: nombreVisible.trim() })

      // Un batch escribe varios documentos de forma atómica: o todos o ninguno.
      const lote = writeBatch(baseDeDatos)
      lote.set(doc(baseDeDatos, 'users', usuarioCreado.uid), {
        uid: usuarioCreado.uid,
        nombreVisible: nombreVisible.trim(),
        nombreUsuario: nombreUsuario.trim(),
        nombreUsuarioNormalizado: normalizado,
        correo: correo.trim().toLowerCase(),
        creadoEn: serverTimestamp(),
      } satisfies Omit<Usuario, 'creadoEn'> & { creadoEn: unknown })
      lote.set(referenciaNombre, {
        uid: usuarioCreado.uid,
        correo: correo.trim().toLowerCase(),
        nombreUsuarioNormalizado: normalizado,
      })
      await lote.commit()
    } catch (error) {
      // Si falló algo después de crear el usuario, lo borramos para no dejar
      // cuentas huérfanas. Solo funciona justo después del registro.
      if (usuarioCreado !== null) {
        try {
          await deleteUser(usuarioCreado)
        } catch {
          // El usuario podrá borrarlo manualmente; no ocultamos el error real.
        }
      }
      throw new Error(traducirErrorFirebase(error))
    }
  }

  /**
   * Permite entrar con correo o con @usuario. Si el texto no contiene '@',
   * buscamos el documento usernames para obtener el correo asociado.
   */
  async function iniciarSesion(identificador: string, contrasena: string): Promise<void> {
    const texto = identificador.trim()
    let correo = texto

    if (!texto.includes('@')) {
      const referenciaNombre = doc(
        baseDeDatos,
        'usernames',
        normalizarNombreUsuario(texto),
      )
      const documento = await getDoc(referenciaNombre)
      if (!documento.exists()) {
        throw new Error('No encontramos ese nombre de usuario.')
      }
      correo = String(documento.data().correo)
    }

    try {
      await signInWithEmailAndPassword(autenticacion, correo, contrasena)
    } catch (error) {
      throw new Error(traducirErrorFirebase(error))
    }
  }

  async function cerrarSesion(): Promise<void> {
    await signOut(autenticacion)
  }

  async function enviarCorreoRecuperacion(correo: string): Promise<void> {
    try {
      await sendPasswordResetEmail(autenticacion, correo.trim())
    } catch (error) {
      throw new Error(traducirErrorFirebase(error))
    }
  }

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      registrarUsuario,
      iniciarSesion,
      cerrarSesion,
      enviarCorreoRecuperacion,
    }),
    // Las funciones se recrean en cada render; las incluimos para satisfacer
    // a ESLint y mantener el valor del contexto siempre actualizado.
    [usuario, cargando],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
