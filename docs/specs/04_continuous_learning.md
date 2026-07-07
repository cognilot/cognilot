# Epic 04: Continuous Learning (Memoria del Sistema)

## Contexto

Cognilot no es estático; evoluciona con el usuario. La "Memoria" es el almacén dinámico de conocimientos que la IA adquiere mediante el aprendizaje automático y la extracción de datos.

## Funcionalidades (User Stories)

### F4.1 - Captura de "Memoria Dinámica"

- **Descripción:** Cuando un usuario llena un campo que la IA no conocía, o corrige una sugerencia, la extensión captura ese valor como un nuevo "recuerdo".
- **Implementación:** Los datos se guardan temporalmente en un "Learned Cache" en la extensión y luego se sincronizan con la base de datos.

### F4.2 - Gestión de Memoria (Info Adicional)

- **Descripción:** El usuario puede ver, editar, renombrar o borrar los conocimientos que la IA ha adquirido en una sección dedicada del perfil.
- **Implementación:** Vista dinámica en el Profile Wizard que mapea los campos JSONB de la base de datos a filas editables.
- **Criterio de Aceptación:** El usuario puede "limpiar" su memoria eliminando datos obsoletos o incorrectos.

### F4.3 - Estandarización de Memoria (Normalization)

- **Descripción:** Los datos capturados en bruto se envían al backend de Groq para ser normalizados y clasificados.
- **Criterio de Aceptación:** Datos similares (ej. "Dev" y "Developer") deben consolidarse automáticamente bajo una misma entrada en la Memoria.

## Reglas de Negocio

- **Validación Humana:** _(Futuro)_ Los nuevos aprendizajes deberían marcarse como "Pendientes de Validar" antes de ser definitivos.
- **Prioridad:** Los datos aprendidos recientemente tienen mayor peso que los datos estáticos del wizard inicial.
