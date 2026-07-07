# Epic 06: Billing & Plans (Monetization)

## Contexto

Define el modelo de negocio de Cognilot, permitiendo diferenciar entre usuarios gratuitos y de pago para gestionar los costes de los modelos de IA (Groq).

## Funcionalidades (User Stories)

### F6.1 - Visualización de Tiers

- **Descripción:** Una página clara (`/plan`) que compare los beneficios de Free vs Pro.
- **Criterio de Aceptación:** El usuario debe ver resaltado su plan actual.

### F6.2 - Gestión de Suscripción (Modo Demo)

- **Descripción:** El usuario puede cambiar su plan mediante un clic (actualmente simulado para pruebas).
- **Implementación:** Actualización directa del campo `plan` en la tabla `users` de Supabase/Postgres.

### F6.3 - Limitación de Funcionalidad (Feature Gating)

- **Descripción:** Ciertas funciones de la API deben retornar un error o aviso si el usuario no tiene el plan adecuado.
- **Criterio de Aceptación:** Si un usuario Free pide un "Batch Suggestion", el backend debe informar que es una funcionalidad Pro.

## Reglas de Negocio

- **Plan Free:** Hasta X sugerencias simples al día. Sin soporte para Selects/Radios.
- **Plan Pro:** Sugerencias ilimitadas, soporte para formularios complejos, prioridad en tiempo de respuesta.
