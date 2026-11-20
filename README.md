# Keddix — Planes con amigos

Aplicación web (PWA) gratuita para organizar quedadas entre grupos de amigos.
Código: https://github.com/Jirjilio/Keddix · Web: https://jirjilio.github.io/Keddix/

## Qué incluye

- **Acceso** con correo o con `@usuario` y contraseña; sesión persistida en el navegador.
- **Grupos** con invitaciones por código o enlace; el dueño puede regenerar o desactivar la invitación.
- **Planes** con descripción larga, precio opcional por persona, una o varias opciones de fecha/hora y votación sencilla.
- **Permisos finos**: cualquier miembro crea planes; solo el creador y sus editores los editan; solo el creador asigna editores o borra el plan.
- **PWA instalable** desde el navegador (manifest + service worker con caché de la app).
- **Diseño responsive** pensado primero para móvil.
- **Modelo preparado para chat**: el tipo `Mensaje` ya está definido en `src/types.ts`.

Stack: React + Vite + TypeScript, Firebase Authentication + Firestore (plan Spark),
GitHub Pages para el alojamiento. Sin coste.

## 1. Puesta en marcha en local

```bash
npm install
node scripts/generar-iconos.mjs   # solo si faltan los PNG de public/icons
npm run dev
```

`npm run build` comprueba los tipos y genera `dist/`.

### Configurar Firebase (imprescindible)

1. Crea un proyecto en https://console.firebase.google.com/ (plan Spark, gratis).
2. **Authentication → Sign-in method**: activa *Correo electrónico/contraseña*.
3. **Firestore Database**: crea la base de datos (modo producción).
4. **Reglas**: pega el contenido de `firestore.rules` en *Firestore → Reglas* y publica.
5. **Authentication → Configuración → Dominios autorizados**: añade `jirjilio.github.io`
   (si no, Firebase bloqueará el acceso desde la web publicada; `localhost` ya viene).
6. **Configuración del proyecto → Tus apps → App web**: copia el objeto `firebaseConfig`.
7. Copia `.env.example` a `.env.local` y rellena las seis variables `VITE_FIREBASE_*`.
8. Reinicia `npm run dev`.

> Los valores de `firebaseConfig` no son secretos: Firebase los envía al navegador.
> La seguridad real está en `firestore.rules`, no en ocultarlos.

Si falta `.env.local`, la web muestra una pantalla explicativa en lugar de fallar.

## 2. Despliegue

Ahora mismo (workflow de Actions todavía no activado):

1. `VITE_BASE_PATH=/Keddix/ npm run build`
2. Copiar el contenido de `dist/` a la rama `gh-pages`.
3. GitHub Pages sirve esa rama.

Para activar el despliegue automático:

1. Crea los seis secretos `VITE_FIREBASE_*` en *Settings → Secrets and variables → Actions*.
2. Copia `deploy-workflow.yml.example` a `.github/workflows/deploy.yml`
   (necesitas un token con permiso `workflow` o hacerlo desde la web de GitHub).
3. En *Settings → Pages → Source* elige **GitHub Actions**.

El workflow calcula la ruta base solo, así que renombrar el repo no requiere tocar el código.

## 3. Estructura del código (comentado en español)

```
src/
├─ main.tsx                  Entrada: monta React (el service worker lo inyecta Vite)
├─ App.tsx                   Rutas (HashRouter) y protección de pantallas privadas
├─ firebase.ts               Configuración de Firebase y detección de .env.local
├─ types.ts                  Entidades de Firestore (incluido Mensaje para chat futuro)
├─ estilos.css               Tema, componentes y media queries responsive
├─ autenticacion/
│  └─ AuthContext.tsx        Registro, entrada, salida y recuperación de contraseña
├─ servicios/
│  ├─ grupos.ts              Grupos, miembros e invitaciones
│  ├─ planes.ts              Planes, opciones de fecha, votos y confirmación
│  └─ usuarios.ts            Perfiles para mostrar nombres de votantes/editores
├─ componentes/
│  ├─ Cabecera.tsx           Barra superior con usuario y botón de salida
│  ├─ FormularioPlan.tsx     Crear/editar plan con opciones de fecha múltiples
│  ├─ TarjetaPlan.tsx        Resumen de un plan en la lista del grupo
│  ├─ IndicadorCarga.tsx     Estado de carga
│  └─ BloqueError.tsx        Errores con botón de reintento
├─ paginas/
│  ├─ PaginaEntrar.tsx       Entrar / registrarse / recuperar contraseña
│  ├─ PaginaGrupos.tsx       Lista de grupos, crear y unirse con código
│  ├─ PaginaGrupo.tsx        Miembros, invitación y planes de un grupo
│  ├─ PaginaPlanNuevo.tsx    Formulario de creación de plan
│  ├─ PaginaPlan.tsx         Ficha del plan: votos, confirmación y editores
│  ├─ PaginaUnirse.tsx       Destino de los enlaces de invitación
│  └─ PaginaNoEncontrada.tsx Ruta 404
└─ utilidades/
   ├─ formatos.ts            Formateo de fechas/precios y traducción de errores
   └─ useDatosRemotos.ts     Hook de carga con estados y reintento
public/icons/                Iconos PNG generados por scripts/generar-iconos.mjs
firestore.rules              Reglas de seguridad (la "puerta" de la base de datos)
firebase.json                Apunta las reglas anteriores (para Firebase CLI)
```

Todas las funciones, tipos y archivos están comentados en español y usan nombres
descriptivos (`crearGrupo`, `votarOpcion`, `obtenerNombresPorUid`, …) para que
se pueda seguir el flujo leyendo el código.

## 4. Modelo de datos resumido

```
users/{uid}                                  Perfil público
usernames/{usuarioNormalizado}              @usuario -> email (para entrar)
groups/{grupoId}                             Grupo + código de invitación
groups/{grupoId}/members/{uid}               Pertenencia y rol (owner/member)
groups/{grupoId}/plans/{planId}              Plan con opciones y editores
groups/{grupoId}/plans/{planId}/votes/{uid}  Un voto por persona
invites/{codigo}                             Código -> grupo, activo o no
```

Cuando se active el chat, los mensajes irán en
`groups/{grupoId}/plans/{planId}/messages/{mensajeId}` con la forma de `Mensaje`.

## 5. Copias de seguridad manuales (gratis)

Las copias automáticas gestionadas por Firebase requieren el plan Blaze (de pago).
Alternativa gratuita: dos scripts que usan la Admin SDK y guardan/leen un JSON en tu PC.

**Preparación (una vez):**

1. Firebase Console → Configuración del proyecto → **Cuentas de servicio**.
2. **Generar nueva clave privada** (se descarga un `.json`).
3. Cópialo en la raíz del proyecto como `serviceAccount.json`.
   Está en `.gitignore`, así que **nunca** se sube a GitHub. Es un secreto: quien
   lo tenga puede leer y escribir en tu base de datos saltándose las reglas.

**Hacer una copia** (por ejemplo cada dos semanas):

```bash
npm run backup
```

Crea `backups/backup-AAAA-MM-DD-HHmm.json` con todos los documentos y sus
subcolecciones. Guarda además ese archivo fuera del PC (disco externo, Drive…).

**Ver qué haría una restauración** (sin escribir nada):

```bash
npm run restore -- backups/backup-2026-12-01-0930.json
```

**Aplicar la restauración** (sobrescribe los documentos con la misma ruta):

```bash
npm run restore -- backups/backup-2026-12-01-0930.json --confirm
```

La restauración no borra documentos nuevos creados después de la copia; simplemente
vuelve a escribir los que había en ella. Las lecturas de una copia entran en la
capa gratuita de Spark (50.000/día), más que suficientes para este proyecto.
