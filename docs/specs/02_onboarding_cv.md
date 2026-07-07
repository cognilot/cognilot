# Epic 02: Smart Onboarding & Profile Intelligence

## Contexto

Para que la IA de Cognilot sea efectiva, necesita conocer al usuario. Esta Epic cubre el proceso de recolección de esa "base de conocimiento" de forma inteligente y con la menor fricción posible.

## Funcionalidades (User Stories)

### F2.1 - Gestión Unificada de Memoria (Single-view Profile)

- **Descripción:** Una vista única y centralizada donde el usuario gestiona todo el conocimiento que la IA tiene sobre él, organizado por categorías de memoria:
  1.  **Identidad:** Quién es y cómo contactarlo.
  2.  **Localización:** Dónde se encuentra (para filtros geográficos).
  3.  **Experiencia y Educación:** Su trayectoria profesional (alimentada principalmente por el CV).
- **Criterio de Aceptación:** El usuario puede editar cualquier bloque de memoria en una sola página, con guardado automático o por secciones, sin necesidad de navegar por pasos "Siguiente/Atrás".

### F2.2 - CV Intelligence (AI Parsing)

- **Descripción:** El usuario puede subir su CV (PDF o DOCX) para que la IA complete el perfil automáticamente.
- **Implementación:**
  1.  El backend (`/api/onboarding/parse-cv`) procesa el archivo con Groq.
  2.  Extrae entidades (nombre, empresas, fechas) y las devuelve de forma estructurada.
  3.  El frontend precarga estos datos directamente en los bloques correspondientes de la Memoria.
- **Criterio de Aceptación:** Al subir el CV, los bloques de "Experiencia" y "Educación" se pueblan automáticamente y el usuario recibe un feedback visual de los nuevos "recuerdos" añadidos.

### F2.3 - Autocompletado de Ubicación (Maps API)

- **Descripción:** Un botón "Detectar mi ubicación" que llena los campos de dirección automáticamente.
- **Implementación:** Uso de Geolocation API del navegador y búsqueda inversa con OpenStreetMap (Nominatim).
- **Regla:** El usuario debe dar permiso explícito de ubicación.

### F2.4 - Dashboard Onboarding Guide (Interactive Checklist)

- **Descripción:** Una guía visual en la página `/welcome` que muestra los pasos pendientes para que el asistente de IA alcance el 100% de su capacidad.
- **Pasos Sugeridos:**
  1.  **Configurar Localización:** Activar geolocalización para autocompletar ciudad/país.
  2.  **Cargar Experiencia (CV):** Subir el currículum para que la IA extraiga el historial profesional.
  3.  **Entrenar Memoria Manual:** Añadir al menos un dato personalizado (ej. "Disponibilidad: Inmediata") para uso frecuente.
- **Funcionalidades Clave:**
  - **Deep Linking & Focus:** Cada paso tiene un botón que lleva al usuario a `/profile`, realiza un auto-scroll hasta la sección y activa un efecto de "pulso" visual (glow) en el componente objetivo para guiar la atención del usuario.
  - **Indicador de Capacidad:** Un medidor visual ("AI Capacity") que aumenta conforme se completan los pasos.
  - **Omitir/Descartar:** El usuario puede cerrar la guía si desea usar la app con funcionalidad básica.
- **Criterio de Aceptación:** La guía solo aparece si el perfil no está al 100% y el usuario no la ha descartado previamente.

### F2.5 - Aprendizaje Manual (Custom Knowledge)

- **Descripción:** Permitir al usuario inyectar conocimientos específicos a la "Memoria" de la IA que no encajan en los campos estándar.
- **Implementación:**
  1.  Un componente de entrada libre en la vista de Memoria.
  2.  Formato sugerido: `Clave: Valor` (ej. "Pretensiones: 50k").
  3.  Al presionar `Enter`, el dato se añade al campo `data_learned` (JSONB) en Supabase.
- **Criterio de Aceptación:** El usuario puede añadir, renombrar o eliminar estos "recuerdos" manuales instantáneamente.

## Reglas de Negocio

- El usuario puede navegar libremente por la app sin completar el perfil.
- La IA informará sutilmente en la extensión si los datos están incompletos.
- Los datos del perfil se guardan de dos formas:
  1.  **SQL:** Para datos estructurados fijos (nombre, email).
  2.  **Learned Data (JSONB):** Para datos dinámicos o variaciones (aliases) que la IA aprende con el tiempo.
