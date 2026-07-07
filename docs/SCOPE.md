# 🎯 Alcance MVP

Este documento define de forma precisa los límites funcionales y técnicos de **Cognilot (Cognilot)** en su fase MVP. Establece lo que está incluido, lo que se excluye explícitamente y los criterios de aceptación para el desarrollo.

---

## 📋 Matriz de Control de Funcionalidades

| Característica                          | ¿En MVP? | Fase de Entrega | Propietario         | Notas                                                                          |
| :-------------------------------------- | :------- | :-------------- | :------------------ | :----------------------------------------------------------------------------- |
| **Detección de Formularios Web**        | **Sí**   | MVP             | SDK / Extensión     | Registro en segundo plano usando `FieldRegistry` en carga de página.           |
| **Autocompletado de Inputs en Web**     | **Sí**   | MVP             | SDK / Extensión     | Inyección de Ghost Text y autocompletado en foco del campo de texto.           |
| **Llenado en Lote (Solve All)**         | **Sí**   | MVP             | Extensión / Sidebar | Llenado secuencial de todo el formulario detectado desde la barra lateral.     |
| **Refinamiento de Texto (Ctrl+Enter)**  | **Sí**   | MVP             | API / Extensión     | Refinamiento rápido con IA en campos individuales de la web.                   |
| **Aprendizaje Pasivo / Guardar Alias**  | **Sí**   | MVP             | SDK / Extensión     | Sincronización pasiva en desenfoque del input (`blur`) al escribir un valor.   |
| **Teclado Móvil Integrado**             | No       | Alcance Futuro  | Core / Mobile       | Planificado para la Fase 3 del Roadmap.                                        |
| **Dashboard Web de Configuración**      | **Sí**   | MVP             | React Web App       | Vista básica para ver los alias guardados, perfil y configurar API Key propia. |
| **Comandos Inline en Inputs (/)**       | **Sí**   | MVP             | API / Extensión     | Captura sintáctica en inputs web de comandos (Ej: `/traducir hola`).           |
| **Inferencia Adaptativa (Gemini Nano)** | **Sí**   | MVP             | SDK / Extensión     | Uso directo de la API del navegador si está disponible (Costo $0).             |
| **Soporte BYOK (Key Propia)**           | **Sí**   | MVP             | SDK / Extensión     | Permitir ingresar claves API (OpenAI/Groq) locales para evadir límites.        |
| **Límites de Crédito Diario**           | **Sí**   | MVP             | API Backend         | Control de consumo gratuito por IP/usuario (ej: 50 créditos/día).              |
| **Overlay Desktop (Hotkeys Globales)**  | No       | Excluido        | Desktop Client      | Omitido por completo del roadmap para evitar complejidad con APIs de OS.       |

> **Decisión:** Se excluye la facturación activa y las pasarelas de pago del MVP. En su lugar, para promocionar el proyecto como portafolio personal/open-source y capturar leads, el MVP implementará un límite suave de uso gratuito (50 créditos diarios) controlado por el backend, con una vista de "Lista de Espera / Pro Plan Waitlist" para medir la intención de compra real del autocompletado de formularios.

---

## 🚫 Exclusiones Explícitas de Alcance

1.  **Automatización de aplicaciones nativas de escritorio o móviles:** Cognilot no interactuará con aplicaciones como SAP, Excel local, Slack de escritorio o WhatsApp nativo.
2.  **Captura de pantalla automática o lectura visual (OCR):** En la web, la detección se basará estrictamente en la lectura del código HTML expuesto (DOM). No se procesará OCR ni análisis de imágenes de la pantalla en esta fase.
3.  **Monetización con pasarelas de pago integradas:** Las pasarelas de pago activas (Stripe/PayPal) y flujos de suscripción bloqueantes se posponen. El MVP será completamente gratis con límites diarios o BYOK.

---

## 🛠️ Definition of Done (DoD)

Para que cualquier componente o funcionalidad se considere completa y lista para pasar a pruebas, debe cumplir los siguientes puntos:

1.  **Cero dependencias huérfanas o redundantes:** El paquete debe estar optimizado y usar `pnpm` como gestor de paquetes exclusivo.
2.  **Cobertura de pruebas automatizadas:**
    - Tests de backend (FastAPI/Pytest) validando las respuestas de los endpoints `/suggestions/v2` y `/suggestions/batch`.
    - Tests de SDK (Vitest) verificando la correcta inserción en el `FieldRegistry`.
3.  **Tipado Estricto:** Código escrito en TypeScript sin uso de `any` en los tipos de negocio principales (exclusiones de terceros deben tener `@ts-ignore` justificados).
4.  **Compilación Exitosa:** La extensión y la aplicación web deben compilar sin errores en su versión de producción (`pnpm build`).

---

## 🔗 Referencias

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md)
- [🤝 Contratos de Interfaz](CONTRACTS.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](LOGIC.md)
- [🗺️ Roadmap de Producto](ROADMAP.md)
