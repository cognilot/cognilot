# Epic 03: AI Engine (Suggestions & Actions)

## Contexto

Es el núcleo de valor de Cognilot. Este motor procesa el contexto del navegador y el perfil del usuario para generar respuestas inteligentes y tomar decisiones sobre elementos de la interfaz web.

## Funcionalidades (User Stories)

### F3.1 - Sugerencia de Campo Único (Refinement)

- **Descripción:** El usuario puede solicitar que la IA redacte o mejore el texto de un input específico.
- **Implementación:**
  1.  El backend recibe el `raw_text` (si hay), la `label` del campo y el contexto de la página.
  2.  Se utiliza un prompt de "Enriquecimiento" en Groq para generar una respuesta profesional y coherente con el perfil del usuario.
- **Criterio de Aceptación:** La respuesta debe estar libre de comillas innecesarias y formateada correctamente para el tipo de campo (ej. si es un campo de "Nombre", no debe devolver una oración completa).

### F3.2 - Sugerencias Masivas Semánticas (Batch Suggestions)

- **Descripción:** La extensión identifica todos los campos de un formulario y pide a la IA que genere valores para todos ellos simultáneamente.
- **Implementación:**
  1.  Endpoint `/api/suggestions/batch`.
  2.  Envía una lista de "preguntas" (campos detectados).
  3.  La IA devuelve un mapa de `field_id -> value`.
- **Criterio de Aceptación:** Capacidad de procesar formularios de hasta 20 campos en una sola llamada.

### F3.3 - Toma de Decisiones en Controles Complejos (Actions)

- **Descripción:** La IA decide qué opción marcar en Checkboxes, Radio Buttons y Selects.
- **Implementación:**
  1.  Endpoint `/api/actions`.
  2.  La IA analiza las opciones disponibles (`options`) y el perfil del usuario para encontrar la coincidencia semántica más cercana.
- **Criterio de Aceptación:** Si hay una opción "Hombre" y "Mujer", y el perfil dice "Género: Masculino", la IA debe seleccionar la opción correcta con un índice o valor exacto.

### F3.4 - AI Playground (Demo Mode)

- **Descripción:** Una página interna (`/playground`) que contiene un formulario de prueba exhaustivo para que el usuario experimente con la potencia de la IA en un entorno seguro.
- **Implementación:** Formulario estático que simula una aplicación de trabajo real. La extensión lo detecta como un sitio válido y permite el autocompletado total.
- **Criterio de Aceptación:** El usuario puede ver a la IA llenar el 100% del formulario demo sin que los datos se envíen a ningún servidor externo real.

## Reglas de Negocio

- **Privacidad:** Los datos del usuario (PII) solo se envían al LLM si el usuario ha iniciado sesión.
- **Tiering:** Las sugerencias Batch y la toma de decisiones en campos complejos (Selects/Radios) están limitadas por el plan del usuario (Pro).
