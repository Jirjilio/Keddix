# Planes con amigos

Aplicación web para organizar quedadas entre grupos de amigos.

## Estado actual

Fase 1: esqueleto mínimo (React + Vite + TypeScript) y despliegue en GitHub Pages.

## Desarrollo

```bash
npm install
npm run dev
```

`npm run build` comprueba los tipos y genera la carpeta `dist/`.

## Despliegue en GitHub Pages

1. El código fuente está en la rama `main`.
2. La web publicada está en la rama `gh-pages` (contiene el `dist/` generado).
3. En el repo: **Settings → Pages → Build and deployment → Source: rama `gh-pages`**.

El workflow automático está preparado en `deploy-workflow.yml.example`. Se activará copiándolo
a `.github/workflows/deploy.yml` cuando el token de GitHub tenga el permiso `workflow`.
La ruta base (`/<nombre-del-repo>/`) se calcula sola en el workflow, así que no hace falta
editar `vite.config.ts`.

La URL de este proyecto es `https://jirjilio.github.io/Keddix/`.

## Próximas fases

Firebase Auth + Firestore, grupos e invitaciones, planes con opciones de fecha y votos,
permisos de edición y PWA instalable. Las variables de Firebase están preparadas en
`.env.example`.
