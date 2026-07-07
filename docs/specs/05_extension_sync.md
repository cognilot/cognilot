# Epic 05: Extension-Web Ecosystem Sync

## Contexto

Garantiza que la experiencia entre la Web App (donde el usuario configura todo) y la Extensión (donde el usuario usa la IA) sea fluida y sin fricciones.

## Funcionalidades (User Stories)

### F5.1 - Extension Bridge (Mensajería)

- **Descripción:** Comunicación bidireccional mediante `window.postMessage` y `chrome.runtime`.
- **Criterio de Aceptación:** Si el usuario actualiza su nombre en la Web App, la extensión debe recibir un evento `Cognilot_PROFILE_UPDATED` y refrescar su caché local inmediatamente.

### F5.2 - Inyección de UI en Terceros

- **Descripción:** La extensión debe inyectar botones de "Asistente" en campos de texto de páginas web externas.
- **Criterio de Aceptación:** El botón (icono de Cognilot) debe aparecer discretamente dentro o al lado de los inputs detectados.

### F5.3 - Estado de Conexión

- **Descripción:** La Web App muestra si la extensión está instalada y activa.
- **Criterio de Aceptación:** Indicador visual en el Sidebar que cambia de color según el estado de la extensión.

### F5.4 - Persistencia Local-First (Storage)

- **Descripción:** Para garantizar latencia cero y privacidad, la "Memoria" completa del usuario se sincroniza y almacena en el `chrome.storage.local` de la extensión.
- **Implementación:**
  1.  Al detectar un cambio en la Web (evento `Cognilot_PROFILE_UPDATED`), la extensión descarga el perfil completo.
  2.  Guarda los datos en el almacenamiento local de la extensión.
  3.  Cuando el usuario interactúa con un formulario, la extensión lee de su almacenamiento local, sin necesidad de llamadas al backend.
- **Criterio de Aceptación:** La extensión funciona incluso si la API de Cognilot tiene una caída temporal, siempre que los datos ya hayan sido sincronizados previamente.

### F5.5 - Inteligencia de Contexto (Form vs Generic)

- **Descripción:** Un motor de decisión que determina qué nivel de asistencia ofrecer basándose en la naturaleza del campo de texto.
- **Comportamiento:**
  1.  **Detección de Formulario:** Si el campo pertenece a un formulario, se activa el **Modo Cognilot** (sugerencias precisas de perfil).
  2.  **Campos Genéricos:** En barras de búsqueda, chats o inputs sin contexto claro, el Modo Cognilot se desactiva para evitar intrusiones innecesarias.
  3.  **Omni-Presence:** El soporte para el trigger `>` (Omni-Prompt) permanece activo de forma universal en ambos casos, pero solo se manifiesta si el usuario lo invoca explícitamente.
- **Criterio de Aceptación:** El usuario no ve sugerencias de autocompletado en buscadores (Google, YT) pero sí puede usar `>` en ellos si lo desea.

## Reglas de Negocio

- La comunicación debe estar protegida para evitar que sitios web maliciosos envíen mensajes falsos al Bridge.
