# Template: DESIGN.md

Usa esta plantilla solo cuando el usuario solicite crear o actualizar `DESIGN.md` en la raíz del proyecto **y** el proyecto sea frontend (detecta React, Vue, Angular, Next.js, Svelte, TailwindCSS, etc.).

## Estructura

```markdown
---
name: { Project Brand Name }
version: 1.0.0
description: { Short summary of the design aesthetic }
colors:
  primary: '#hex'
  secondary: '#hex'
  brand-accent: '#hex'
  text-main: '#hex'
  text-dim: '#hex'
  success: '#hex'
  warning: '#hex'
  error: '#hex'
typography:
  primary:
    fontFamily: 'FontName, fallback'
    fontSize: 14px
  mono:
    fontFamily: 'FontName, monospace'
    fontSize: 13px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
components:
  card:
    backgroundColor: '{colors.primary}'
    rounded: '{rounded.md}'
    border: '1px solid {colors.text-dim}'
---

## Overview

Resumen del diseño general, tema, y objetivo de marca.

## Colors

Desglose de la paleta de colores, justificación de accesibilidad/contraste.
**Requisito WCAG AA:** contraste mínimo 4.5:1 para texto normal.

## Typography

- **Primary**: {font} para {uso}.
- **Mono**: {font} para {uso}.

## Layout

Reglas de espaciado, padding, grids, y flex.

## Elevation & Depth

Reglas de sombras y profundidad.

## Shapes

- **sm ({value})**: {uso}
- **md ({value})**: {uso}
- **lg ({value})**: {uso}

## Components

- **{component}**: {descripción de estilo, refs a tokens}

## Do's and Don'ts

### Do:

- {buena práctica 1}
- {buena práctica 2}

### Don't:

- {mala práctica 1}
- {mala práctica 2}
```

## Reglas de Validación

- **Token References**: Los valores de componentes en YAML deben referenciar tokens con `{colors.primary}`.
- **Contraste WCAG AA**: Ratio mínimo 4.5:1 para texto normal.
- **Correspondencia**: Cada token en YAML debe tener su sección en prosa (ej. `rounded` → `## Shapes`).
- **Responsabilidad única**: DESIGN.md es solo para tokens visuales. Nunca incluyas estructura de directorios, schemas de DB, o endpoints.
