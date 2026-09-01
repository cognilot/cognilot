# Reglas del Proyecto Cognilot (AutoSolve)

Estas reglas definen el comportamiento, arquitectura y estilo que deben seguir los agentes de IA al trabajar en el monorepo de Cognilot.

## 1. Arquitectura y Stack Tecnológico

- **Monorepo:** El proyecto utiliza `pnpm workspaces`. Asegúrate de ejecutar los comandos en el workspace correspondiente o usar `pnpm --filter`.
- **Backend (`cognilot-api`):**
  - Stack estricto: **Hono + Drizzle ORM + PostgreSQL (Supabase)**.
  - Prohibido utilizar Express, NestJS, Prisma u otras herramientas no especificadas.
  - El middleware de validación debe usar JWT firmados por Supabase.
- **Frontend (`cognilot-web`):**
  - Next.js 15 (App Router).
  - Manejo de estados y asincronía moderno (React 19, Server Components donde aplique).

## 2. Diseño y UI/UX (Modern Dark Minimalist)

- Toda nueva página o componente debe seguir el sistema de diseño Modern Dark Minimalist definido en `DESIGN.md`.
- Tipografía dual: `font-sans` (Geist / Inter) para la gran mayoría de la UI (títulos, cuerpo, controles). `font-mono` reservada exclusivamente para el logotipo `> cognilot_`, atajos de teclado `<kbd>`, badges técnicos y código.
- Fondo oscuro (`#050505`) por defecto con ambientación sutil.
- Botones modernos (`Get Started`, `Save Changes`, `Sign Out`) sin nombres de scripts `.sh`.
- Mantener la jerarquía limpia: evitar saturación de comentarios `//`, títulos `# archivo.md` o footers con comandos terminal. El comentario JSDoc `/** ... */` se reserva solo como acento de marca en el Hero subtext.

## 3. Extensiones y SDK

- **InferenceRouter:** Al añadir proveedores de IA, debes seguir el patrón Strategy (ej. `BYOKProvider`, `GroqProvider`, `GeminiNanoProvider`).
- **LearningService:** El guardado de datos locales debe respetar la cola de sincronización con el servidor (debounce de 30s) para evitar spam de peticiones.
- **GhostTextController:** La lógica de autocompletado en interfaces debe emular el comportamiento de VS Code (sugerencias grises inline, Tab para aceptar, Escape para cancelar).

## 4. Estándares Generales

- Sigue las reglas globales de desarrollo, pero en caso de conflicto, estas reglas específicas del proyecto tienen prioridad.
- Evita agregar dependencias innecesarias, mantén el código modular en el workspace correspondiente.
