---
name: technical-writer
description: Orchestrates the creation and maintenance of a complete project context suite for AI agents and human developers. Analyzes the project stack, structure, and dependencies to generate up to 9 context files: docs/ARCHITECTURE.md, docs/CONTRACTS.md, docs/DATABASE.md, docs/MODEL.md, docs/ROADMAP.md, docs/SCOPE.md (technical docs for humans), AGENTS.md (AI behavior rules at project root), README.md (professional project readme at root), and DESIGN.md (visual tokens at root, for frontend projects). Use this skill whenever the user asks to generate or update documentation, initialize a project for AI agents, set up project context, create or update README.md, or create AGENTS.md, ARCHITECTURE.md, DESIGN.md, or any of the 6 doc files. Also triggers when the user mentions "context", "documentation suite", "project setup for AI", "readme generator", or "update docs". Handles both init (from scratch) and update (detects existing files, regenerates them, commits changes).
---

# technical-writer

This skill analyzes a project and generates a complete context suite. It consolidates what were previously separate skills (docs-suite-creator for human docs, ai-rules-generator for AI rules, generate-readme for professional README, design-md-spec for design tokens) into a single entry point that shares one project analysis phase.

---

## Workflow

### 1. Analyze the Project

Do not ask the user what the stack is. Figure it out by exploring the workspace:

- Read `package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.
- Identify the frontend framework (React, Vue, Next.js, Svelte, Angular, Vite, etc.)
- Identify the backend framework (Hono, Express, FastAPI, Django, etc.)
- Identify databases and ORMs (Supabase, Prisma, Drizzle, Mongoose, etc.)
- Identify styling libraries (TailwindCSS, Material UI, Vanilla Extract, etc.)
- Identify testing frameworks (Vitest, Jest, Playwright, pytest, etc.)
- Identify CI/CD and release tooling (GitHub Actions, semantic-release, commitlint)
- Scan the directory structure to understand where components, APIs, tests, and configs live.
- Determine if the project has a frontend (to decide if DESIGN.md applies).

### Detect Git Workflow

Detect the project's Git workflow automatically (without asking):

- Check if `develop` branch exists (`git branch --list develop`)
- Check current branch naming patterns for clues (issue refs like `42-`, or short feat names)
- Look at recent merge commits to see if they go to `develop` or directly to `main`
- If `develop` exists → Git Flow candidate
- If only `main` + issue refs in branch names → GitHub Flow candidate
- If only `main` + short kebab names → TBD candidate
- Save the detected workflow as `{gitWorkflow}` for use in AGENTS.md

### 2. Detect Existing State

Check which of these files already exist:

- `docs/ARCHITECTURE.md`
- `docs/CONTRACTS.md`
- `docs/DATABASE.md`
- `docs/MODEL.md` or `docs/LOGIC.md`
- `docs/ROADMAP.md`
- `docs/SCOPE.md`
- `README.md` (root)
- `AGENTS.md` (root)
- `DESIGN.md` (root)

Classify the state:

- **init**: none or few files exist
- **update**: most or all files exist (regenerate)

### 3. Ask the User

Present a clear prompt:

```
Project: {name} ({stack})
State: {init | update}

What would you like to generate?

[ ] Docs Técnicos — ARCHITECTURE.md, CONTRACTS.md, DATABASE.md, MODEL.md, ROADMAP.md, SCOPE.md (→ docs/)
[ ] README.md — README profesional (→ raíz)
[ ] AGENTS.md — Reglas para asistentes IA (→ raíz)
[ ] DESIGN.md — Tokens visuales (→ raíz, solo frontend)

Custom paths? (default: docs/ + root)
```

### 4. Generate or Update

For each selected output:

1. Load the corresponding template from `references/`:
   - `architecture.md` → `docs/ARCHITECTURE.md`
   - `contracts.md` → `docs/CONTRACTS.md`
   - `database.md` → `docs/DATABASE.md`
   - `model.md` → `docs/MODEL.md`
   - `roadmap.md` → `docs/ROADMAP.md`
   - `scope.md` → `docs/SCOPE.md`
   - `agents.md` → `AGENTS.md`
   - `readme.md` → `README.md`
   - `design.md` → `DESIGN.md`

2. Fill template placeholders with real data from the analysis:
   - Framework names and versions
   - Package manager
   - Actual endpoints, DB schemas, and code patterns found
   - Real project structure

3. Write the file:
   - **init**: create from scratch
   - **update**: regenerate and overwrite (show diff to user after writing)

4. If `DESIGN.md` is requested:
   - Only offer it if a frontend stack is detected
   - If not frontend, skip automatically and inform the user

### 5. Commit and Push

After all files are generated/updated:

1. `git add` the affected files
2. Commit with Conventional Commits:
   - `docs(project-context): add architecture, contracts and agents configuration`
   - Or `docs(project-context): update architecture and database schema`
3. `git pull --rebase` (or fetch + merge)
4. `git push`

Report back to the user with a summary of what was created/updated and the commit message.

---

## AGENTS.md Self-Maintenance Clause

When generating `AGENTS.md`, append this section at the end:

```markdown
## Mantenimiento de Documentación

Si durante tu interacción detectas cambios significativos en el proyecto
(nuevas dependencias, cambios arquitectónicos, nuevos endpoints o schemas):
**informa al usuario y sugiere ejecutar el skill `technical-writer`**
para sincronizar la documentación con el estado actual del proyecto.
```

This creates a loop: the AI reads AGENTS.md → detects drift → notifies user → user triggers this skill → docs stay in sync.

---

## Style Rules (all generated files)

1. **Cero Ambiguidad (MVP vs Post-MVP)**: Clasificación binaria. No usar "Beta" en los 6 docs técnicos.
2. **"Beta" Exception**: Solo permitido en `ROADMAP.md` para describir release strategy.
3. **Language**: Técnico, directo. Usa el idioma que pida el usuario (default: español técnico).
4. **Diagrams**: Mermaid blocks para arquitectura, flujos, ERDs, Gantt. Nada de imágenes externas.
5. **Cross-references**: Cada archivo termina con `## 🔗 Referencias` y links relativos. Sin `file:///`.
6. **Decisions**: Usa blockquotes `> **Decisión:** ...` para trade-offs y justificaciones.

---

## References Overview

This skill loads templates from `references/` as needed. Each template is self-contained:

| File                         | Load When                            |
| ---------------------------- | ------------------------------------ |
| `references/architecture.md` | User wants ARCHITECTURE.md           |
| `references/contracts.md`    | User wants CONTRACTS.md              |
| `references/database.md`     | User wants DATABASE.md               |
| `references/model.md`        | User wants MODEL.md                  |
| `references/roadmap.md`      | User wants ROADMAP.md                |
| `references/scope.md`        | User wants SCOPE.md                  |
| `references/agents.md`       | User wants AGENTS.md                 |
| `references/readme.md`       | User wants README.md                 |
| `references/design.md`       | User wants DESIGN.md (frontend only) |

Each template contains the full file structure, validation rules, and examples. Load only the ones needed for the current task.
