---
name: daily-init
description: Generates a Scrum Daily Standup report at the start of a session. Analyzes Git state (branch, dirty status, last commit), associated user stories/tasks (inferred from branch name), and project breaches (uncommitted files, missing tests, .env drift, stale branches) in a lightweight, non-blocking manner. Trigger whenever starting a session or greeting ("hola", "buenos días", "qué hay pendiente", "cómo vamos", "estado del proyecto", "qué hago hoy", "daily").
---

# daily-init

Skill de diagnóstico y sincronización matutina (Scrum Daily Standup). Diseñado bajo el principio de **responsabilidad única (SRP)**: su único propósito es inspeccionar el estado actual del proyecto y entregar un reporte ejecutivo claro, conciso y de solo lectura.

**Características principales:**

- **100% no bloqueante y autónomo:** Sin dependencias externas de servidores MCP; reporta el estado con gracia sin detener la interacción ni arrojar errores fatales.
- **Sin efectos secundarios:** No ejecuta modificaciones, commits ni eliminaciones de ramas.
- **PowerShell nativo:** Libre de operadores Bash o dependencias frágiles de CLI.

---

## Workflow de Inspección

Cuando se active, ejecuta las siguientes 3 revisiones en orden e imprime el reporte final:

### 1. Inspección de Git y Sesión Actual

- Verificar si el directorio es un repositorio Git (`git rev-parse --is-inside-work-tree`).
  - Si no lo es, indicarlo y finalizar el reporte.
- Detectar la rama actual (`git branch --show-current`).
- Verificar el estado del árbol de trabajo (`git status -s`):
  - Contar archivos modificados/sin rastrear (`dirty` vs `clean`).
- Obtener el último commit local (`git log -1 --format="%h — %s (%cr)"`).
- Comparar con el remoto configurado (`git status -uno` o estado vs `origin/<branch>`).

### 2. Detección de Historias de Usuario (HU) / Tareas

- **Inferencia por rama:** Extraer prefijo numérico o kebab si existe (ej. `42-add-jwt` o `feat/42-add-jwt` $\rightarrow$ `HU-42`, `us-142-select-fix` $\rightarrow$ `HU-142`).
- Si la rama no contiene un identificador identificable, indicar "Rama sin identificador de HU explícito".

### 3. Detección Heurística de Brechas y Alertas (Breaches)

Ejecutar revisiones preventivas rápidas:

- **Cambios acumulados sin commit:** Si hay más de 5 archivos modificados en `git status -s`.
- **Stashes guardados:** `git stash list` (alertar si existen stashes olvidados).
- **Ramas locales inactivas (stale branches):** Revisar si hay ramas locales distintas a la principal sin commits en más de 48 horas.
- **Desincronización de variables (.env drift):** Si existen `.env.example` y `.env`, contrastar nombres de variables y alertar si faltan variables en uno u otro.
- **Tests faltantes en cambios recientes:** Listar archivos de código (`.ts`, `.tsx`, `.py`, etc.) modificados en los últimos 7 días y alertar si carecen de su archivo de prueba correspondiente.

---

## Formato del Reporte Daily

El resultado debe presentarse de forma visual, directa y sin introducciones vacías:

```markdown
# ☀️ Scrum Daily Report — {project-name}

### 📌 1. ¿Dónde nos quedamos? (Estado Actual)

- **Branch activa:** `{current-branch}` ({clean / dirty, con n cambios pendientes})
- **Último commit:** `{hash} — {mensaje}` ({hace X tiempo})
- **Sincronización:** {Al día con origin / X commits adelante}

### 📋 2. Tarea en Curso

- **HU Detectada:** {HU-ID — Título o "Sin HU asociada en el nombre de branch"}
- **Pendientes inmediatos:** Revisa tu tablero habitual o lista de PRs abiertos.

### ⚠️ 3. Alertas y Brechas Preventivas

- {Listado de brechas encontradas: .env drift, stashes pendientes, tests huérfanos}
- _(Si no hay brechas: "✅ Árbol limpio y configuración consistente")_

### 🎯 4. Foco Sugerido

- {Recomendación de 1 o 2 líneas sobre el siguiente paso lógico, ej.: "Continuar con la implementación de X y luego usar `dev-flow push` para subir cambios con seguridad."}
```

---

## Triggering

Esta skill se activa proactivamente ante cualquier saludo o inicio de sesión:

- "hola", "buenos días", "buenas tardes", "empecemos", "arranquemos"
- "qué hay pendiente", "cómo vamos", "dame el estado", "qué hago hoy", "daily"
- Al iniciar una nueva conversación si el contexto es vago y se requiere orientación inicial.
