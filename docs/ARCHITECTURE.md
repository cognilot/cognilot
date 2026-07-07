# 🏗️ Arquitectura Técnica

Este documento describe la arquitectura técnica de **Cognilot**, diseñada bajo el patrón de un Cerebro Centralizado y Múltiples Extremidades (Clientes Especializados).

El sistema separa estrictamente la capa de inferencia y almacenamiento del contexto (Backend/API) de la interacción y renderizado con la interfaz de usuario (Clientes).

> **Stack Actual (v2.0):**
>
> - **Backend:** TypeScript (Node.js) + Hono · Vercel Serverless Functions
> - **Frontend:** Next.js 15 App Router · Vercel
> - **SDK:** TypeScript ESM · pnpm Workspace
> - **Extension:** TypeScript + Vite · Chrome Web Store
> - **Database:** Supabase (PostgreSQL) + Drizzle ORM
> - **Monorepo:** pnpm Workspaces

---

## 🗺️ Diagrama de Componentes del Sistema

```mermaid
graph TD
    %% Clientes (Capa de Presentación)
    subgraph Clientes [Extremidades / Clientes]
        WebExt["@cognilot/extension (Chrome)"]
        WebApp["@cognilot/web (Next.js)"]
    end

    %% SDK
    subgraph SDK_Layer [Capa del SDK]
        SDK["@cognilot/sdk (TypeScript ESM)"]
        InfRouter[InferenceRouter]
        PA[PlatformAdapter Interface]
    end

    %% Inferencia Local (Anónimos)
    subgraph LocalProc [Inferencia Local — Usuarios Anónimos]
        Nano[Chrome Gemini Nano — window.ai]
    end

    %% Backend Serverless
    subgraph Backend [AI Core — @cognilot/api]
        API[Hono · Vercel Serverless]
        LS[LangChain.js / AI Engine]
        LLM[Groq LLM — Llama 3.3 70b]
    end

    %% BYOK
    subgraph ThirdParty [BYOK — Usuarios Avanzados]
        BYOK[OpenAI / Anthropic / Groq Key Propio]
    end

    %% Base de Datos
    subgraph Database [Persistencia]
        DB[(Supabase / PostgreSQL)]
        Drizzle[Drizzle ORM]
    end

    %% Relaciones
    WebExt -->|Usa| PA
    WebApp -->|Auth + Dashboard| DB

    PA --> SDK
    SDK --> InfRouter

    InfRouter -->|"❌ No autenticado → Tier 1"| Nano
    InfRouter -->|"✅ Autenticado → Tier 2"| API
    InfRouter -->|"⚙️ BYOK configurado → Tier 3"| BYOK

    API --> LS
    LS --> LLM
    API --> Drizzle
    Drizzle --> DB
```

> **Decisión Clave:** Se implementa una **Estrategia de Inferencia por Autenticación** en lugar del modelo de cascada simple.
>
> - **Usuarios no autenticados:** `window.ai` (Gemini Nano) — costo $0, ejecución local, sin servidor.
> - **Usuarios autenticados:** Backend en la nube con Groq (mayor calidad, contexto del perfil del usuario).
> - **Usuarios avanzados (BYOK):** Clave propia que omite el backend completamente.

---

## 🔄 Flujos de Datos

### 1. Flujo de Inferencia por Autenticación

```mermaid
sequenceDiagram
    participant Ext as Extension / Cliente
    participant Router as InferenceRouter (SDK)
    participant Auth as AuthAdapter (SDK)
    participant Nano as Gemini Nano (Local)
    participant API as cognilot-api (Vercel)

    Ext->>Router: requestSuggestion(fieldContext)
    Router->>Auth: isAuthenticated()?

    alt Usuario NO autenticado
        Router->>Nano: window.ai.languageModel (local)
        Nano-->>Router: Suggestion (Costo $0)
    else Usuario Autenticado
        Router->>API: POST /api/suggestions/v2 (JWT Bearer)
        API-->>Router: Suggestion (Groq LLM + User Profile Context)
    end

    Router-->>Ext: Texto final sugerido
    Ext->>Ext: Inyecta texto en el input activo
```

### 2. Flujo de Sincronización de Perfil (Extension → Backend)

```mermaid
sequenceDiagram
    participant DOM as Página Web (DOM)
    participant Registry as FieldRegistry (SDK)
    participant API as cognilot-api
    participant DB as Supabase

    DOM->>Registry: PageScanner escanea el DOM al cargar
    Registry->>Registry: Almacena inputs como "pending"
    DOM->>Registry: Usuario enfoca el input
    Registry->>API: POST /api/suggestions/batch (JWT)
    API->>DB: SELECT user_profiles WHERE user_id = $1
    DB-->>API: Profile + Aliases
    API-->>Registry: Sugerencias personalizadas
    Registry->>DOM: Ghost text inyectado

    Note over Registry,API: Al cerrar el formulario / a intervalos:
    Registry->>API: POST /api/profile/sync (datos aprendidos)
    API->>DB: UPSERT user_profiles SET data_learned = merge(...)
```

---

## 🛠️ Entornos y Despliegue

| Entorno      | Paquete               | Hosting                       | Notas                                              |
| :----------- | :-------------------- | :---------------------------- | :------------------------------------------------- |
| **MVP**      | `@cognilot/api`       | Vercel (Serverless Functions) | `cognilot-api/vercel.json` define las rutas        |
| **MVP**      | `@cognilot/web`       | Vercel (Next.js)              | App Router, SSR para marketing, CSR para dashboard |
| **MVP**      | `@cognilot/extension` | Chrome Web Store              | Build con Vite + CRXJS                             |
| **Post-MVP** | Mobile Keyboard       | App Store / Play Store        | Usa `@cognilot/sdk` vía React Native               |

### Monorepo Structure

```
cognilot/                    ← Monorepo root (pnpm workspaces)
├── cognilot-api/            ← @cognilot/api — Hono + Vercel Serverless
├── cognilot-web/            ← @cognilot/web — Next.js 15 + Vite Hybrid
│   └── src/
│       ├── app/             ← Next.js App Router (marketing & dashboard routes)
│       └── views/           ← Vite Views (custom React CSR client pages)
├── cognilot-sdk/            ← @cognilot/sdk — Core logic, TypeScript ESM
├── cognilot-extension/      ← @cognilot/extension — Chrome Extension
├── docs/                    ← Documentation
├── .github/workflows/       ← CI/CD
└── pnpm-workspace.yaml
```

---

## 🔗 Referencias

- [🤝 Contratos de Interfaz](CONTRACTS.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](LOGIC.md)
- [🗺️ Roadmap de Producto](ROADMAP.md)
- [🎯 Alcance MVP](SCOPE.md)
