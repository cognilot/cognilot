# Epic 01: Auth & Identity Management

## Contexto

Cognilot requiere una identidad persistente y segura para que el usuario pueda acceder a su "cerebro digital" desde cualquier pestaña del navegador a través de la extensión.

## Funcionalidades (User Stories)

### F1.1 - Autenticación con Google

- **Descripción:** El usuario debe poder registrarse e iniciar sesión de forma rápida utilizando su cuenta de Google.
- **Implementación:** Se utiliza Supabase Auth como proveedor de identidad.
- **Criterio de Aceptación:** El usuario ve el botón de Google en `/auth`, completa el flujo y es redirigido siempre a la vista `/welcome` (Dashboard Principal).

### F1.2 - Sincronización de Sesión (Cross-App)

- **Descripción:** La sesión iniciada en la web debe estar disponible automáticamente para la extensión.
- **Implementación:**
  1.  La Web App extrae el `access_token` y `refresh_token` de Supabase.
  2.  A través de un `extensionBridge`, envía estos tokens a la extensión.
  3.  La extensión almacena los tokens de forma segura para realizar peticiones a la API en nombre del usuario.
- **Criterio de Aceptación:** Si el usuario hace login en la web, la extensión debe mostrarse como "Conectada" sin pedir login adicional.

### F1.3 - Protección de Rutas (Guards)

- **Descripción:** Las páginas del dashboard (`/welcome`, `/profile`, `/plan`) deben ser inaccesibles para usuarios no autenticados.
- **Implementación:** Componente `ProtectedRoute` en React que verifica el estado de `AuthContext`.

## Reglas de Negocio

- Un usuario solo puede tener una cuenta activa por correo electrónico de Google.
- Si el token expira, la extensión debe poder usar el `refresh_token` para obtener uno nuevo sin intervención del usuario.
