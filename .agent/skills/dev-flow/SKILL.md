---
name: dev-flow
description: Handles the full Git lifecycle — creating branches and pushing code safely. Integrates with agile-harness MCP to create Historias de Usuario (HU) and branches in one step. Automates branch creation following GitHub Flow (default), TBD, or Git Flow conventions. Also manages safe push with conflict validation (dry-run merge local), toolchain detection (lint/format/test), and optional PR creation. Use this skill whenever the user asks to "crear HU", "crear branch para HU", "empezar a trabajar en una historia", or wants to push code ("push seguro", "validar antes de push", "crear PR"). When talking about features, bugs, or tasks, prefer using this skill to create HUs first and then branches. Handles GitHub Flow (branches cortas, PR + review — default), TBD (Google/Meta/Netflix), and Git Flow (Linux Kernel/Hashicorp).
---

# dev-flow

This skill manages the complete Git lifecycle for the project. It has three modes:

- **Crear HU + branch** — crea una Historia de Usuario via MCP y luego la rama para implementarla
- **Branch desde HU existente** — obtiene los detalles de una HU existente via MCP y crea la rama
- **Push seguro** — valida conflictos, corre tests, push y PR

---

## Workflow

### 1. Analyze the Repository

Do not ask the user. Figure it out:

- Is this a git repo? (`git rev-parse --is-inside-work-tree`)
- Default branch: try `main`, then `master` (`git branch --list main`, `git branch --list master`)
- Does `develop` exist? (`git branch --list develop`)
- Current branch name and naming pattern: issue refs like `42-*`? short kebab like `feat/*`? `feature/*`?
- Remote configured? (`git remote -v`)

### 2. Detect Agile-Harness MCP

Check if MCP agile-harness tools are available in the environment:

- Look for tools named `create_epic`, `fetch_existing_epics`, `fetch_project_onboarding` or similar
- If available → store as `{mcpAvailable: true}` for use in menu and HU operations
- If not available → fall back to simple branch creation modes

### 3. Ask the User

Present the action menu:

```
¿Qué quieres hacer?

[ ] Crear HU + branch — crea la HU y la rama en un solo paso
[ ] Branch desde HU existente — ej: "HU-42", "issue 42"
[ ] Push seguro — validar, mergear localmente y pushear

Describe el contexto o task:
___________________________________________________________
```

If **Crear HU + branch** or **Branch desde HU existente** is selected, present workflow selection:

```
¿Qué workflow de ramas?

[x] GitHub Flow — recomendado (PR + review, squash merge)
[ ] TBD — branches ultra cortas, feature flags
[ ] Git Flow — develop, feature/release/hotfix

Workflow por defecto: GitHub Flow (Enter para confirmar)
```

### 4. Execute by Mode

#### 4a. Crear HU + branch

1. **Crear HU via MCP:**
   - Usar el contexto del usuario para llamar a `create_epic` (o la herramienta MCP equivalente para crear HU)
   - Extraer de la respuesta: `{huId}`, `{huTitle}`, `{huType}` (feat/fix/docs/chore)
   - Si el MCP devuelve un formato diferente, mapear los campos relevantes

2. **Crear branch desde la HU:**
   - Cargar la reference del workflow seleccionado
   - Si GitHub Flow (default): `git checkout -b "{huId}-{huTitle-kebab}"` desde `main`/`master`
   - Stash previo, sync base branch
   - Incluir el enlace o referencia a la HU en el commit template

3. **Summary:** "HU-42 creada: Agregar login con JWT. Branch 42-add-jwt-auth creada desde master."

#### 4b. Branch desde HU existente

1. **Obtener HU via MCP:**
   - Extraer el ID de HU del contexto (`HU-42`, `#42`, `issue 42`, `AGILE-42` — aceptar formatos flexibles)
   - Llamar a `fetch_existing_epics` o herramienta equivalente para obtener detalles
   - Extraer `{huTitle}`, `{huType}`, `{huDescription}` de la respuesta
   - Si el MCP no encuentra la HU, informar al usuario y preguntar el título manualmente

2. **Crear branch desde la HU:**
   - Cargar la reference del workflow seleccionado
   - Nombre: `{huId}-{huTitle-kebab}` (o el formato que corresponda al workflow)
   - Stash previo, sync base branch
   - `git checkout -b "{huId}-{huTitle-kebab}"`

3. **Summary:** "Branch 42-add-jwt-auth creada desde master para HU-42: Agregar login con JWT."

#### 4c. Push seguro

- `develop` exists + current branch is `feature/*`/`bugfix/*` → target `develop`
- `develop` exists + current branch is `release/*`/`hotfix/*` → target `main`
- Otherwise → target = default branch (main/master)
- Show detected target and ask confirmation
- Load `references/safe-push.md` and execute

### 5. Summary

After completion, provide a brief summary:

| Mode              | Example summary                                                                      |
| ----------------- | ------------------------------------------------------------------------------------ |
| Crear HU + branch | "HU-42 creada: Agregar login con JWT. Branch 42-add-jwt-auth creada desde master."   |
| Branch desde HU   | "Branch 42-add-jwt-auth creada desde master para HU-42."                             |
| Push seguro       | "Merge local contra master sin conflictos. Validaciones OK. Pusheé 42-add-jwt-auth." |
