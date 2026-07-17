# 🤝 Contratos de Interfaz

Este documento define la especificación de los contratos de comunicación y endpoints expuestos por el backend de **Cognilot (Cognilot)**. Toda comunicación entre la extensión de navegador, el teclado móvil y el API Core debe adherirse a estas especificaciones.

---

## 🔐 Autenticación y Autorización

### 1. Token de Acceso del Usuario (JWT)

Todas las solicitudes a las APIs privadas del backend requieren que las cabeceras HTTP contengan un Bearer Token válido obtenido a través de Supabase Auth.

```http
Authorization: Bearer <JWT_USER_TOKEN>
```

---

## 🌐 Especificación de Endpoints

### 1. Sugerencias e Inferencia de Asistente Único (MVP)

Utilizado para la asistencia en tiempo real cuando un campo recibe un atajo del teclado (ej: `Ctrl+Enter`) o comandos inline.

- **Método:** `POST`
- **Ruta:** `/api/suggestions/v2`
- **Seguridad:** Requiere JWT
- **Request Body (JSON):**
  ```json
  {
    "client": {
      "type": "web_extension", // "web_extension" | "mobile_keyboard"
      "version": "1.0.0"
    },
    "input": {
      "raw_text": "resiliencia", // Contenido actual del input
      "cursor_position": 11
    },
    "context": {
      "source_app": "whatsapp.com", // Dominio en web o Package ID en móvil (ej. com.whatsapp)
      "clipboard": "Texto copiado en portapapeles", // Opcional
      "profile_snapshot": {
        "display_name": "Jack",
        "email": "j@example.com"
      }
    },
    "command": null // Opcional. Ej: "traducir". Si se omite, se analiza en backend.
  }
  ```
- **Response Body (JSON - HTTP 200 OK):**
  ```json
  {
    "success": true,
    "results": [
      "Capacidad de adaptación de un ser vivo frente a un agente perturbador o un estado o situación adversos."
    ],
    "source": "llama-3.3-70b-versatile",
    "meta": {
      "processing_time_ms": 240,
      "is_command": false
    }
  }
  ```

> **Decisión:** El endpoint `/api/suggestions/v2` unifica el análisis de comandos inline (`/`) y consultas generales. Esto evita que los clientes móviles o de extensión tengan que analizar sintácticamente los textos locales, delegando toda la heurística al backend para permitir adiciones dinámicas de comandos sin actualizar las apps clientes.

---

### 2. Sugerencias de Formularios por Lote (MVP)

Utilizado para pre-escanear y resolver de manera masiva los inputs detectados en una página web.

- **Método:** `POST`
- **Ruta:** `/api/suggestions/batch`
- **Seguridad:** Requiere JWT
- **Request Body (JSON):**
  ```json
  {
    "provider": "llama-3.3-70b-versatile",
    "questions": [
      {
        "key": "input_name_1",
        "field": {
          "label": "Nombre Completo",
          "placeholder": "Ej: Juan Pérez",
          "name": "fullname",
          "id": "field-name-id",
          "type": "text",
          "tagName": "INPUT",
          "required": true
        }
      },
      {
        "key": "input_email_2",
        "field": {
          "label": "Correo Electrónico",
          "placeholder": "correo@dominio.com",
          "name": "email",
          "id": "field-email-id",
          "type": "email",
          "tagName": "INPUT",
          "required": true
        }
      }
    ],
    "user_context": {
      "profile": {
        "given_name": "Jack",
        "family_name": "Doe",
        "email": "j@example.com"
      }
    },
    "page_context": {
      "domain": "github.com",
      "path": "/signup",
      "title": "Create your account"
    }
  }
  ```
- **Response Body (JSON - HTTP 200 OK):**
  ```json
  {
    "request_id": "req_87fd8shf8s",
    "results": {
      "input_name_1": ["Jack Doe"],
      "input_email_2": ["j@example.com"]
    },
    "standardized_profile": {
      "given_name": "Jack",
      "family_name": "Doe",
      "email": "j@example.com"
    },
    "meta": {
      "processing_time_ms": 420,
      "model": "llama-3.3-70b-versatile"
    }
  }
  ```

---

### 3. Sincronización del Aprendizaje Pasivo (MVP)

Enviado cuando el usuario escribe manualmente en un input y el sistema almacena ese dato de forma segura en su memoria de perfil.

- **Método:** `POST`
- **Ruta:** `/api/learner/standardize`
- **Seguridad:** Requiere JWT
- **Request Body (JSON):**
  ```json
  {
    "label": "Teléfono de Contacto",
    "value": "+51999999999",
    "context": {
      "domain": "linkedin.com",
      "path": "/jobs"
    }
  }
  ```
- **Response Body (JSON - HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "Aprendizaje sincronizado exitosamente en el perfil del usuario"
  }
  ```

---

## 🔗 Referencias

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](LOGIC.md)
- [🗺️ Roadmap de Producto](ROADMAP.md)
- [🎯 Alcance MVP](SCOPE.md)
