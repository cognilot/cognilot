# 🧭 Cognilot Monorepo

Bienvenido al monorepo de **Cognilot**, un asistente inteligente para el autocompletado y aprendizaje contextual de formularios web en tiempo real.

Este repositorio está estructurado como un `pnpm workspace` con múltiples paquetes e implementa desarrollo impulsado por especificaciones (**Specification-Driven Development**).

---

## 📂 Estructura del Monorepo

El monorepo está dividido en las siguientes áreas clave:

- **`cognilot-sdk/`**: El núcleo de inteligencia y enrutamiento (`InferenceRouter`). Maneja las integraciones con los modelos local (Gemini Nano), proxies seguros (Groq Llama-3.3-70B) y claves de usuario directas (BYOK).
- **`cognilot-extension/`**: Extensión de navegador basada en Manifest V3 que realiza análisis de DOM en tiempo real, renderiza sugerencias tipo sombra (Ghost Text) y sincroniza datos recolectados.
- **`cognilot-api/`**: Servidor de backend rápido construido con **Hono** y **Drizzle ORM** sobre PostgreSQL/Supabase que procesa sincronizaciones y guarda datos de usuario.
- **`cognilot-web/`**: Panel de control del usuario desarrollado con **Next.js 15** (App Router), con interfaces tipo consola/terminal IDE que permite gestionar recuerdos, atajos (aliases) y probar habilidades.

---

## 🏗️ Centro de Documentación (`docs/`)

Toda la especificación de arquitectura y producto está centralizada en la carpeta `docs/`. Consúltala para entender las políticas de diseño y contratos técnicos:

- [🏗️ Arquitectura Técnica](docs/ARCHITECTURE.md) - Diagramas generales y flujo de datos.
- [🤝 Contratos de Interfaz](docs/CONTRACTS.md) - Especificación y definición de endpoints de la API.
- [🗄️ Modelo de Base de Datos](docs/DATABASE.md) - Esquema entidad-relación y diccionario de datos.
- [🧠 Lógica Core e Inferencia](docs/LOGIC.md) - Flujo de matching semántico y prompts.
- [🗺️ Roadmap de Producto](docs/ROADMAP.md) - Fases de desarrollo (MVP, Beta, Escala).
- [🎯 Alcance MVP](docs/SCOPE.md) - Matriz de características y exclusiones.
- [📄 Product Requirement Document (PRD)](docs/PRD.md) - Epics de producto e historias de usuario.

---

## 🚀 Compilación y Ejecución Local

### Prerrequisitos

- Tener instalado [Node.js](https://nodejs.org/) (v20 o superior).
- Tener instalado `pnpm` de forma global:
  ```bash
  npm install -g pnpm
  ```

### 1. Inicializar dependencias del espacio de trabajo

```bash
pnpm install
```

### 2. Compilar el SDK

Dado que otros módulos dependen del SDK local, este debe compilarse previamente:

```bash
pnpm --filter @cognilot/sdk build
```

### 3. Servidores de desarrollo en paralelo

- **Para levantar el API de Hono:**

  ```bash
  pnpm --filter @cognilot/api dev
  ```

  _(Escucha por defecto en `http://localhost:8000`)_

- **Para levantar el Dashboard de Next.js:**
  ```bash
  pnpm --filter @cognilot/web dev
  ```
  _(Escucha por defecto en `http://localhost:3000`)_

- **Para la extensión de navegador (modo desarrollo con recarga automática):**
  ```bash
  pnpm --filter @cognilot/extension dev
  ```
  _(Inicia el servidor de HMR en `http://localhost:5183` — la extensión se carga descomprimida desde `cognilot-extension/dist/`)_

  > Para probarla localmente: abre `chrome://extensions`, activa **Modo desarrollador**, haz clic en **Cargar descomprimida** y selecciona la carpeta `cognilot-extension/dist/`.

### 4. Ejecución de Pruebas Unitarias

Para correr la suite completa de 81 pruebas unitarias integradas en los diferentes paquetes:

```bash
pnpm -r test
```
