# 🚀 Cognilot (Cognilot) - Product Overview

Este documento es la **Fuente de Verdad Maestro** para las especificaciones y la visión de Cognilot (Cognilot). Conecta la visión general de producto con las especificaciones funcionales y la arquitectura técnica.

---

## 🎯 Visión del Producto

Cognilot es tu copiloto cognitivo omnipresente. Centraliza tu identidad, experiencia y conocimiento en un único "cerebro digital" para potenciar tu escritura de dos formas: automatizando de forma inteligente cualquier proceso de llenado de formularios y brindando una interfaz de comandos de IA universal en campos de texto, permitiéndote generar y refinar contenido contextualizado al instante.

- **Alcance Actual (MVP):** Extensión web de navegador enfocada en el DOM (autocompletado, comandos `/` y llenado de formularios).
- **Alcance Futuro (Post-MVP):** Teclado móvil inteligente personalizado (iOS y Android) como método de entrada universal. El cliente de escritorio (Desktop) ha sido **excluido** del alcance por motivos de viabilidad técnica y seguridad del sistema operativo.

---

## 🏗️ Base Documental Técnica

Para entender la infraestructura de código, base de datos y contratos, consulta la documentación técnica:

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md) - Estructura de Core Centralizado y Clientes.
- [🤝 Contratos de Interfaz](CONTRACTS.md) - Especificaciones detalladas de API y endpoints.
- [🗄️ Modelo de Base de Datos](DATABASE.md) - Esquema de PostgreSQL / Supabase.
- [🧠 Lógica Core e Inferencia](LOGIC.md) - Algoritmos de coincidencia semántica y flujo de inferencia.
- [🗺️ Roadmap de Producto](ROADMAP.md) - Cronograma y fases de desarrollo.
- [🎯 Alcance MVP](SCOPE.md) - Matriz de características, exclusiones y DoD.

---

## 🗺️ Mapa de Epics (Funcional)

| ID  | Epic                                                  | Descripción                                                                    | Estado          |
| :-- | :---------------------------------------------------- | :----------------------------------------------------------------------------- | :-------------- |
| 01  | [Auth & Identity](specs/01_auth_identity.md)          | Gestión de acceso y seguridad entre la aplicación Web y la Extensión.          | ✅ Implementado |
| 02  | [Smart Onboarding](specs/02_onboarding_cv.md)         | Construcción del perfil de datos mediante asistente interactivo y carga de CV. | ✅ Implementado |
| 03  | [AI Engine](specs/03_ai_engine.md)                    | El motor que genera sugerencias y resuelve campos.                             | ✅ Implementado |
| 04  | [Continuous Learner](specs/04_continuous_learning.md) | Feedback loop (aprendizaje pasivo) para mejorar la IA con el uso.              | 🛠️ En Refactor  |
| 05  | [Extension Sync](specs/05_extension_sync.md)          | Sincronización en tiempo real Web <-> Extensión.                               | ✅ Implementado |
| 06  | [Billing & Plans](specs/06_billing_plans.md)          | Control de acceso y suscripciones (Soporte básico Free vs Pro).                | ✅ Básico       |
| 07  | [Analytics](specs/07_productivity_analytics.md)       | Métricas de ahorro de tiempo y eficiencia.                                     | ⏳ Post-MVP     |
| 08  | [Omni-Prompt](specs/08_omni_prompt.md)                | Comandos inline con `/` (ej. `/traducir`) y habilidades dinámicas.             | 🛠️ Definido     |
| 09  | Teclado Móvil (Sin spec)                              | Teclado nativo Android/iOS con AI integrada en la barra de sugerencias.        | ⏳ Post-MVP     |

---

## 🔗 Referencias

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md)
- [🤝 Contratos de Interfaz](CONTRACTS.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](LOGIC.md)
- [🗺️ Roadmap de Producto](ROADMAP.md)
- [🎯 Alcance MVP](SCOPE.md)
