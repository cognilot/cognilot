# Template: AGENTS.md

Usa esta plantilla cuando el usuario solicite crear o actualizar `AGENTS.md` en la raíz del proyecto.

## Estructura

```markdown
# {Project Name} — AI Engineering Context

## 1. Arquitectura y Stack

- **Monorepo/Estructura**: [Descripción breve]
- **Frontend**: [Framework, estado, UI library]
- **Backend**: [Framework, ORM, Database]
- **Lenguaje**: [TypeScript 5.3+, strict mode]
- **Package Manager**: [pnpm 9.x]

## 2. Estándares de Código

- [Regla 1: ej. TypeScript strict, no `any`]
- [Regla 2: ej. imports absolutos sobre relativos]
- [Regla 3: ej. convención de nombres]

## 3. UI/UX y Sistema de Diseño

- [Framework de estilos, ej. TailwindCSS]
- [Tokens de diseño — referenciar DESIGN.md si existe]
- [Reglas de componentes]

## 4. Git y Workflow

- **Flujo de Git**: {TBD | GitHub Flow | Git Flow} (detectado automáticamente)
- **Ramas desde**: {main | develop}
- **Convención de nombres**: {feat/{desc} | {issue}-{desc} | feature/{desc}}
- **Merge a**: {main | develop}
- **Para crear una rama nueva**, ejecuta la skill `dev-flow`
- **Test Runner**: [Jest, Vitest, pytest]
- **Commits**: [Conventional Commits]
- **CI/CD**: [GitHub Actions, etc.]
- **Release**: [semantic-release]

## 5. Documentación Técnica

La documentación del proyecto vive en `docs/`:

- `docs/ARCHITECTURE.md` — Arquitectura técnica
- `docs/CONTRACTS.md` — Contratos de interfaz
- `docs/DATABASE.md` — Modelo de base de datos
- `docs/MODEL.md` — Lógica core / inferencia
- `docs/ROADMAP.md` — Roadmap de producto
- `docs/SCOPE.md` — Alcance MVP

Si necesitas detalles sobre arquitectura, endpoints, o schemas de DB, consulta estos archivos antes de generar código.

## 6. Mantenimiento de Documentación

Si durante tu interacción detectas cambios significativos en el proyecto
(nuevas dependencias, cambios arquitectónicos, nuevos endpoints o schemas):
**informa al usuario y sugiere ejecutar el skill `technical-writer`**
para sincronizar la documentación con el estado actual del proyecto.
```

## Reglas

- La sección 5 (Documentación Técnica) solo se incluye si los `docs/` existen.
- La sección 3 (UI/UX) referencias `DESIGN.md` solo si ese archivo existe en la raíz.
- Las referencias son rutas relativas desde la raíz del proyecto.
