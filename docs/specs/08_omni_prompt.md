# Epic 08: Omni-Prompt (Inline AI Assistant)

## Contexto

Transforma cualquier entrada de texto en la web en una potente terminal de IA. Permite al usuario generar contenido contextualizado (redacción de emails, mensajes, código, etc.) directamente en el lugar donde lo necesita, utilizando comandos rápidos y su "Memoria" personal.

## Funcionalidades (User Stories)

### F8.1 - Reconocimiento Universal de Áreas Editables (Omni-Detection)

- **Descripción:** La extensión identifica y monitoriza dinámicamente cualquier elemento en el que el usuario pueda escribir, sin importar su tecnología subyacente.
- **Alcance:**
  - Inputs de texto y Textareas estándar.
  - Editores enriquecidos (`contenteditable`) como Gmail, LinkedIn, Slack y Notion.
- **Trigger de Escucha:** Se activa al poner el foco (cursor) en el elemento. Monitoriza el inicio de línea con el carácter `>`.
- **Criterio de Aceptación:** El Omni-Prompt debe estar disponible en al menos el 90% de los editores de texto más comunes de la web.

### F8.2 - Sistema de "Skills" (Prompt Templates)

- **Descripción:** Uso de banderas `--skill_name` para aplicar plantillas de prompts predefinidas en la Web App.
- **Ejemplos:** `--email`, `--linkedin`, `--fix_grammar`, `--summarize`.
- **Implementación:** El dashboard de Cognilot permitirá al usuario crear y editar sus propias Skills (nombre y prompt base).

### F8.3 - Inyección Directa y Backup (The Magic Step)

- **Descripción:** Al generar la respuesta, Cognilot reemplaza el comando escrito (`> contexto --skill`) por el texto generado por la IA.
- **Doble Salida:**
  1.  **Inyección:** El texto aparece directamente en el input web.
  2.  **Backup:** La respuesta se copia automáticamente al portapapeles del sistema.
- **Criterio de Aceptación:** El reemplazo de texto debe ser fluido y no romper los editores complejos (como el de Gmail).

### F8.4 - Contexto Multi-Modal (Clipboard Context)

- **Descripción:** Capacidad de usar el contenido actual del portapapeles (texto o imagen) como contexto adicional para la IA.
- **Caso de Uso:** Copiar una descripción de empleo -> Ir a Gmail -> Escribir `> --cv_intro` -> La IA usa la descripción copiada y tu CV para redactar la intro.

## Reglas de Negocio

- **Seguridad:** La lectura del portapapeles solo ocurre bajo el trigger explícito del usuario.
- **Control de Costes:** El uso de Omni-Prompt consume tokens de IA (Groq) y puede estar limitado en el plan gratuito.
- **Feedback:** Al inyectar el texto, se muestra un breve indicador visual de "Generado por Cognilot".
