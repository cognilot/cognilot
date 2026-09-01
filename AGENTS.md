# Cognilot — AI Engineering Context

## 1. Arquitectura y Stack

- **Monorepo/Estructura**: `pnpm workspaces` monorepo. Ejecutar comandos usando `pnpm --filter` o en el workspace respectivo.
- **Frontend (`cognilot-web`)**: Next.js 15 (App Router) + React 19 + Tailwind CSS.
- **Backend (`cognilot-api`)**: Hono + Drizzle ORM + PostgreSQL (Supabase) + JWT firmado por Supabase.
- **Extension (`cognilot-extension`)**: Chrome Extension (Vite + TypeScript).
- **SDK (`cognilot-sdk`)**: TypeScript ESM.
- **Package Manager**: `pnpm 9.x+`.

## 2. Estándares de Código

- **Tipado estricto**: Evitar el uso de `any` en los modelos y tipos core de negocio.
- **SOLID & Modularidad**: Dividir lógica en módulos pequeños e independientes; evitar archivos "dios".
- **Imports**: Usar paths absolutos y limpios.
- **Testing**: Pruebas unitarias para el frontend/SDK con Vitest.

## 3. UI/UX y Sistema de Diseño (Modern Dark Minimalist)

- **Diseño Unificado**: Toda página y componente nuevo debe seguir el estándar Modern Dark Minimalist detallado en `DESIGN.md`.
- **Tipografía Dual**: `font-sans` (Geist / Inter) para el 90% de la UI (títulos, cuerpo, controles, botones, navegación). `font-mono` (Geist Mono / JetBrains Mono) reservada exclusivamente para el logotipo `> cognilot_`, atajos de teclado `<kbd>`, badges técnicos y metadatos.
- **Void Background**: Fondo `#050505` por defecto con iluminación ambiental sutil.
- **Botones y Acciones**: Botones modernos con estados limpios (`Get Started`, `Save Changes`, `Sign Out`). Prohibido usar nombres de scripts bash (`./run.sh`).
- **Dashboard Layout**: Estructura bloqueada `100vh` (`h-screen overflow-hidden`) con sidebar fijo y scroll interno en el área de contenido.
- **Prohibición**: No saturar la interfaz con gimmicks de terminal (evitar títulos `# archivo.md`, comentarios excesivos, y footers con árboles ASCII). El comentario JSDoc `/** ... */` se reserva solo como acento de marca en el Hero subtext.

## 4. Git y Workflow

- **Flujo de Git**: GitHub Flow (Ramas cortas, Pull Requests, Squash Merge).
- **Ramas desde**: `master` (rama por defecto).
- **Convención de nombres**: `us-{huId}-{desc-kebab}` o `feat/{desc-kebab}`.
- **Draft Pull Requests**: Al crear una rama nueva, subirla inmediatamente a remoto y crear un Draft Pull Request en GitHub apuntando a `master` para seguimiento temprano.
- **Commits**: Seguir [Conventional Commits]. Los cambios en documentación (en `docs/`, `AGENTS.md`, `DESIGN.md`, `README.md`) deben confirmarse de forma independiente con el tipo `docs` (ej: `docs(scope): mensaje`) y nunca mezclarse con cambios de código en el mismo commit.

## 5. Documentación Técnica

La documentación del proyecto vive en la raíz y en `docs/`:

- `DESIGN.md` — Especificación de tokens visuales y sistema de diseño.
- `docs/ARCHITECTURE.md` — Arquitectura de Cerebro centralizado y extremidades.
- `docs/CONTRACTS.md` — Contratos de las APIs y mensajes.
- `docs/DATABASE.md` — Esquema relacional de Supabase/Drizzle.
- `docs/LOGIC.md` — Lógica core de autocompletado y sincronización.
- `docs/ROADMAP.md` — Fases del producto.
- `docs/SCOPE.md` — Alcance del MVP.

Si necesitas detalles sobre arquitectura, endpoints o schemas de BD, consulta estos archivos antes de generar código.

## 6. Mantenimiento de Documentación

Si durante tu interacción detectas cambios significativos en el proyecto (nuevas dependencias, cambios arquitectónicos, nuevos endpoints o schemas):
**informa al usuario y sugiere ejecutar el skill `technical-writer`** para sincronizar la documentación con el estado actual del proyecto.
