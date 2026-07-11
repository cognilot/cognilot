# TBD (Trunk-Based Development)

> **Target Branch (push):** `main` (o `master` si es la default)
> **Merge type:** squash merge

Usa esta reference cuando el workflow seleccionado sea TBD.

## Filosofía

Feature branches duran horas, no días. Integración continua todo el tiempo. Releases manejadas con feature flags, no ramas.

**Usado por:** Google, Meta, Netflix

## Reglas de Branch

- **Branch desde:** `main`
- **Naming:** `{tipo}/{descripcion-kebab-case}`
  - Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Descripción: corta, kebab-case, sin número de issue
  - Ejemplos: `feat/login-form`, `fix/header-alignment`, `chore/update-deps`
- **Duración máxima:** horas (ideal < 4h)
- **Commits:** 1 por branch (squash al final)
- **Destino:** PR directo a `main`
- **Merge:** squash merge
- **Cleanup:** borrar branch local y remoto tras merge
- **Feature flags:** sí — código incompleto va detrás de flags, no en ramas separadas

## Workflow Steps

### 1. Stash Uncommitted Changes

- `git status -s` para verificar cambios
- Si hay: `git stash push -u -m "Auto-stashed before TBD branch"` e informar al usuario

### 2. Switch to Main and Sync

- `git checkout main`
- `git pull origin main` (si hay remote)

### 3. Delete All Other Local Branches

- Estando en `main`, borrar todas las demás ramas locales
- Mantener solo `main`

### 4. Create Branch

- `git checkout -b {tipo}/{kebab-desc}`

### 5. Summary

"Stashed cambios, sincronicé main, eliminé branches locales, y creé feat/login-form."
