# Safe Push (dry-run merge + validaciones + push + PR)

Usa esta reference cuando el usuario quiera hacer push seguro.

Lee el `targetBranch` del workflow reference cargado (tbd.md → `main`, github-flow.md → `main`, git-flow.md → según tipo de rama).

---

## Workflow Steps

### 1. Stash Uncommitted Changes

- `git status -s` para verificar cambios
- Si hay: `git stash push -u -m "Auto-stashed before safe push"` e informar al usuario
- Recordar que hay stash para preguntar al final si aplicar de vuelta

### 2. Fetch and Dry-Run Merge (local, sin commitear)

- `git fetch origin {targetBranch}` — trae lo último del remoto
- Ejecutar merge local para detectar conflictos:
  ```
  $output = git merge origin/{targetBranch} --no-commit --no-ff 2>&1
  ```
- **Caso A: "Already up to date"** → no hay merge en progreso, continuar
- **Caso B: Merge limpio** (`$LASTEXITCODE -eq 0`) → abortar merge: `git merge --abort`. Todo OK, continuar
- **Caso C: Conflictos** (`$LASTEXITCODE -ne 0` y output contiene "CONFLICT" o "conflict") →
  - Mostrar archivos en conflicto al usuario
  - Preguntar: "Hay conflictos en {archivos}. ¿Los resuelvo automáticamente?"
  - Si sí:
    - Resolver conflictos usando herramientas de edición
    - `git add -A`
    - `git commit -m "chore: merge {targetBranch} and resolve conflicts"`
    - Merge commit queda registrado (es la única forma segura de resolver sin perder trabajo)
    - Informar al usuario que se creó un merge commit
  - Si no:
    - `git merge --abort`
    - Informar al usuario: "Merge abortado. Resuelve los conflictos manualmente y vuelve a ejecutar push seguro."

### 3. Run Validations

- Detectar toolchain del proyecto automáticamente:
  - **Node.js** (`package.json` existe):
    - Detectar package manager: `pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `package-lock.json` → `npm`
    - Leer scripts de `package.json`: buscar `lint`, `format`, `test`
    - Ejecutar: `{pm} run lint`, `{pm} run format --check` (o el script correspondiente), `{pm} run test`
  - **Python** (`pyproject.toml` existe):
    - Ejecutar: `uv run ruff check src/ tests/` (si ruff en tool), `uv run ruff format --check src/ tests/`, `uv run pytest`
    - Si existe `Makefile` con target `check`: `make check`
  - **Rust** (`Cargo.toml` existe):
    - Ejecutar: `cargo clippy`, `cargo fmt --check`, `cargo test`
  - **Go** (`go.mod` existe):
    - Ejecutar: `gofmt -l .`, `go vet ./...`, `go test ./...`
  - **Genérico**: si no se detecta toolchain conocido, preguntar al usuario qué comandos ejecutar
- Si falla alguna validación:
  - MOSTRAR errores
  - Preguntar: "¿Corrijo los errores automáticamente?"
  - Si sí: aplicar formatters (`ruff format`, `prettier`, etc.), commit fix, re-ejecutar validaciones
  - Si no: abortar, informar al usuario
- Repetir hasta que todas las validaciones pasen

### 4. Push

- `git push origin {currentBranch}`
- Si push falla (non-fast-forward): preguntar si hacer `git pull --rebase origin {targetBranch}` y reintentar

### 5. Pull Request (opcional)

- Preguntar: "¿Crear PR?"
- Si sí:
  - Usar `gh pr create` o la herramienta MCP `create_pull_request`
  - Título: Conventional Commit basado en la rama (ej: `feat: add jwt authentication`)
  - Cuerpo: incluir resumen de cambios y referencias a issues si se detectaron
  - Si GitHub Flow: sugerir reviewers automáticamente si hay CODEOWNERS

### 6. Post-Push Cleanup

- Si se stashearon cambios al inicio: preguntar "¿Aplicar stash de vuelta?" (`git stash pop`)
- Si TBD: preguntar "¿Eliminar branch local?" (ya está mergeada en main)

### 7. Summary

"Validaciones OK, merge local contra {target} sin conflictos, pusheé {branch}. PR creado: {url}."
