# Git Flow

> **Target Branch (push):** depende del tipo de rama actual:
>
> - `feature/*` o `bugfix/*` → `develop`
> - `release/*` o `hotfix/*` → `main`
>   **Merge type:** merge commit

Usa esta reference cuando el workflow seleccionado sea Git Flow.

## Filosofía

Ramas de larga duración. Releases calendarizadas con versionado semver. Ramas separadas para features, releases, y hotfixes.

**Usado por:** Linux Kernel, Hashicorp (Terraform), Atlassian (Jira), Microsoft (Azure)

## Reglas de Branch

### Tipos de rama

| Tipo        | Desde     | Destino            | Naming                | Duración |
| ----------- | --------- | ------------------ | --------------------- | -------- |
| `feature/*` | `develop` | `develop`          | `feature/{desc}`      | semanas  |
| `release/*` | `develop` | `main` + `develop` | `release/{version}`   | días     |
| `hotfix/*`  | `main`    | `main` + `develop` | `hotfix/{kebab-desc}` | horas    |
| `bugfix/*`  | `develop` | `develop`          | `bugfix/{kebab-desc}` | días     |

- **Tipos para features:** `feature/add-login`, `feature/checkout-flow`
- **Tipos para releases:** `release/2.1.0`, `release/2.2.0-rc1`
- **Tipos para hotfix:** `hotfix/critical-security-patch`, `hotfix/payment-timeout`

### Reglas adicionales

- `develop` siempre existe como rama base para features
- `release/*` se crea antes de una release; se testea, se arregla, y se mergea a `main` y `develop`
- `hotfix/*` se crea desde `main` para bugs críticos; se mergea a `main` y `develop`
- Tags semver en `main`: `v2.1.0`, `v2.2.0`
- Merge commit (no squash) para preservar historia
- No feature flags necesarias (las ramas contienen el código incompleto)

## Workflow Steps

### 1. Stash Uncommitted Changes

- `git status -s` para verificar cambios
- Si hay: `git stash push -u -m "Auto-stashed before Git Flow branch"` e informar al usuario

### 2. Switch to Base Branch and Sync

- **feature/bugfix:** `git checkout develop` → `git pull origin develop`
- **release:** `git checkout develop` → `git pull origin develop`
- **hotfix:** `git checkout main` → `git pull origin main`

### 3. Create Branch

- `git checkout -b {tipo}/{desc}`

### 4. Summary

"Brancé desde develop: feature/add-login. Trabaja con commits normales. Cuando termines, abre PR a develop."

(O para hotfix: "Brancé desde main: hotfix/critical-patch. Cuando termines, mergea a main y develop con merge commit.")
