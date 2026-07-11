---
name: daily-init
description: Single entry point for daily work sessions. Checks environment health (blocking if MCPs or dependencies are missing), recaps session state (branch, HU, last commit), detects pending items and breaches via heuristics, and presents an action menu that delegates to other skills. Use this skill at the START OF EVERY SESSION or whenever the user greets you ("hola", "buenos días", "empecemos", "qué hay pendiente", "qué hago hoy", "cómo vamos", "estado del proyecto"). It orchestrates dev-flow for branches and push, technical-writer for docs, and the agile-harness MCP for HU management. Do NOT wait for the user to ask — if they say hello or any greeting, run this skill proactively.
---

# daily-init

Orchestrator that consolidates every session start into a single command. Runs health checks, recaps state, detects breaches, and presents an actionable menu.

---

## Workflow

### 1. Health Check (blocking)

Check each dependency. If any is missing, show installation instructions and STOP.

#### 1a. Git Repository

- `git rev-parse --is-inside-work-tree`
- If not a git repo: "No hay repositorio Git en este directorio. Crear uno con `git init` o abre el proyecto correcto."
- If yes: detect default branch (`main`/`master`), remote (`git remote -v`)

#### 1b. MCP agile-harness

- Check if tools like `create_epic`, `fetch_existing_epics`, `fetch_project_onboarding` are available in the environment
- If missing: "MCP agile-harness no detectado. Asegúrate de tenerlo configurado en tu cliente. Para instalarlo: npx @jackaranaram/mcp-agile-harness"
- If present: test connectivity by calling a simple endpoint (e.g., `fetch_project_onboarding` or `fetch_existing_epics` with no params)

#### 1c. NPX Skills Package

- Run `npx jackararam/skills --version 2>&1` (or `npx jackararam/skills --help`)
- If not found or errors: "Skills pack no instalado. Instalar con: npx jackararam/skills"
- If found: note the version

#### 1d. Required Skills

- Check if the following skill directories exist:
  - `dev-flow` (in the configured skills path)
  - `technical-writer`
- If any missing: "Skill {name} no encontrado. Asegúrate de que esté instalado en la ruta de skills."

**If any check fails, show ALL failures at once** (not one by one) so the user can fix everything at once, then STOP.

### 2. Session Recap

Collect and display the current session state. Use bullet points, keep it concise.

```
📌 Sesión actual — {project-name}

Branch: {current-branch} ({dirty/clean}, {n} cambios sin commit)
HU asociada: {HU-XX — title} (detectada por nombre de branch)
Último commit: "{message}" — hace {X}h
Último push: hace {X}h (vs origin)
```

**HU detection from branch name:**

- If branch matches `{number}-{kebab}` (e.g., `42-add-jwt-auth`): extract `HU-42` and call MCP `fetch_existing_epics` to get the title
- If branch matches `{type}/{desc}` (e.g., `feat/login-form`): no HU detected, show "Branch sin HU asociada"

### 3. Pending Items (via MCP)

Call `fetch_existing_epics` (or equivalent) to get all HUs:

```
📋 Historias de Usuario

En progreso (branch detectada):
  • HU-42 — Agregar login con JWT

Pendientes:
  • HU-45 — Fix header alignment mobile
  • HU-47 — Upgrade React to 19
```

- Cross-reference branch names with HU IDs to mark "en progreso"
- Include count: "2 pendientes, 1 en progreso"

### 4. Breach Detection (heuristic)

Run the following checks in parallel. Each check is a **suggestion**, not a command. Show only checks that find something.

#### 4a. Tests faltantes

- List files in `src/` (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`)
- For each, check if corresponding test file exists in `tests/`, `__tests__/`, or `src/**/*.test.*`
- Only show if the file has been recently modified (last 7 days): "src/auth/login.ts no tiene test correspondiente"
- Limit: show max 3 suggestions

#### 4b. Stale branches

- `git branch` (list local, excluding default)
- For each: `git log -1 --format=%ci {branch}` → check age
- If > 48h since last commit: "Branch feat/old-feature no tiene actividad desde hace {X} días"
- Suggest cleaning up: "¿Eliminar ramas stale?"

#### 4c. Cambios sin commit

- `git status -s` → count tracked modified files
- If > 5 tracked files uncommitted: "{n} archivos modificados sin commit. ¿Revisar y commitear?"
- Check stash too: `git stash list` → if entries exist, remind user

#### 4d. .env drift

- If `.env.example` exists:
  - Extract keys (lines before `=`)
  - Compare with `.env` keys
  - If keys missing in `.env`: ".env.example tiene {keys} que .env no tiene"
  - If keys missing in `.env.example`: ".env tiene {keys} que .env.example no tiene"

#### 4e. Docs staleness

- Check `AGENTS.md`, `docs/` modification dates: `git log -1 --format=%ci AGENTS.md`
- Compare with last code commit: `git log -1 --format=%ci`
- If docs older than last code commit by > 7 days: "AGENTS.md no se actualiza desde hace {X} días. Sugerir ejecutar technical-writer."
- Also check if docs exist at all

### 5. Action Menu

Present a numbered menu. Each option delegates to another skill or runs a git command directly.

```
🎯 ¿Qué hacemos hoy?

[1] Continuar HU-42 — checkout a 42-add-jwt-auth + mostrar diff
[2] Iniciar HU nueva → dev-flow (Crear HU + branch)
[3] Iniciar HU existente → dev-flow (Branch desde HU)
[4] Push seguro → dev-flow (Push seguro)
[5] Update docs → technical-writer
[6] Fix breaches — acciones sugeridas para cada breach detectado
[7] Salir — no hacer nada
```

**Behavior per option:**

| Option | Action                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | `git checkout {branch}`, then show `git diff --stat origin/{default}..HEAD`                                                                                                     |
| 2      | Delegate to `dev-flow` mode "Crear HU + branch"                                                                                                                                 |
| 3      | Delegate to `dev-flow` mode "Branch desde HU existente"                                                                                                                         |
| 4      | Delegate to `dev-flow` mode "Push seguro"                                                                                                                                       |
| 5      | Delegate to `technical-writer`                                                                                                                                                  |
| 6      | For each breach, show the specific command to fix it (e.g., `touch tests/auth/login.test.ts`, `git branch -D stale-branch`, `git add -A && git commit`, `cp .env.example .env`) |
| 7      | "OK, avísame si necesitas algo."                                                                                                                                                |

After executing any option, return to the menu so the user can chain actions.

---

## Triggering

This skill triggers proactively on ANY greeting or session-start phrase:

- "hola", "buenos días", "buenas tardes", "qué tal", "hey", "hi"
- "empecemos", "arranquemos", "vamos allá"
- "qué hay pendiente", "por dónde iba", "cómo vamos", "dame estado"
- "qué hago hoy", "qué toca hoy", "plan de hoy"
- Also when the user opens a new session/terminal and the first message is vague

When triggered, run the full workflow (1-5) without asking the user if they want it — they greeted you, so they want the state.
