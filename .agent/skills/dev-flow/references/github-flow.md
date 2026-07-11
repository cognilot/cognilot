# GitHub Flow

> **Target Branch (push):** `main` (o `master` si es la default)
> **Merge type:** squash merge (recomendado)

Usa esta reference cuando el workflow seleccionado sea GitHub Flow.

## Filosofía

Feature branches por ticket/historia (días). Todo va a `main` vía PR con code review. Deploy desde `main`.

**Usado por:** GitHub, Spotify, Shopify, startups

## Reglas de Branch

- **Branch desde:** `main`
- **Naming:** `{tipo}/{descripcion-kebab-case}` o `{issue-num}-{descripcion-kebab-case}`
  - Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Si hay número de issue, incluirlo: `42-add-jwt-auth`
  - Ejemplos: `feat/login-form`, `42-fix-header-alignment`, `chore/update-deps`
- **Duración:** días (1-2 por ticket)
- **Commits:** múltiples, mantener historia limpia (rebase antes de PR)
- **Destino:** PR a `main` con code review
- **Merge:** squash merge (recomendado) o merge commit
- **Cleanup:** borrar remote branch tras merge (local no se borra automáticamente)
- **No feature flags:** se usan tickets pequeños, no flags

## Workflow Steps

### 1. Stash Uncommitted Changes

- `git status -s` para verificar cambios
- Si hay: `git stash push -u -m "Auto-stashed before GitHub Flow branch"` e informar al usuario

### 2. Switch to Main and Sync

- `git checkout main`
- `git pull origin main` (si hay remote)

### 3. Create Branch

- `git checkout -b {tipo}/{kebab-desc}` o `git checkout -b {issue-num}-{kebab-desc}`

### 4. Opcional: Issue Template

- Si el usuario lo pide, incluir referencia al issue en el commit inicial o PR body

### 5. Summary

"Sincronicé main y creé 42-add-jwt-auth. Trabaja en esta rama y haz commit normalmente. Cuando termines, abre un PR a main."
