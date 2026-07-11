# Template: CONTRACTS.md

Usa esta plantilla cuando el usuario solicite crear o actualizar `CONTRACTS.md` en `docs/`.

## Estructura

````markdown
# 🤝 Contratos de Interfaz

## Autenticación

Describe el mecanismo de autenticación: JWT, API Keys, OAuth, Session, etc.

## Endpoints

### `{METHOD} /api/{recurso}`

**Descripción:** Breve descripción del endpoint.

**Headers:**
| Header | Valor | Obligatorio |
|---|---|---|
| Authorization | Bearer {token} | Sí |

**Request Body:**

```json
{
  "campo": "tipo | descripción"
}
```
````

**Response `{status_code}`:**

```json
{
  "campo": "tipo | descripción"
}
```

**Errores:**
| Código | Significado |
|---|---|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

## Políticas de Seguridad

Describe reglas de acceso, RLS (Row Level Security), middleware, rate limiting, etc.

## 🔗 Referencias

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](MODEL.md)
- [🗺️ Roadmap de Producto](ROADMAP.md)
- [🎯 Alcance MVP](SCOPE.md)

```

## Reglas

- Cada endpoint debe mostrar: Method, Path, Request, Response, Status Codes.
- Clasifica endpoints como **MVP** o **Alcance Futuro / Post-MVP**.
- No uses la palabra "Beta".
- Las referencias al final usan rutas relativas.
```
