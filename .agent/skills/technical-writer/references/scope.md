# Template: SCOPE.md

Usa esta plantilla cuando el usuario solicite crear o actualizar `SCOPE.md` en `docs/`.

## Estructura

```markdown
# 🎯 Alcance MVP

## Matriz de Control de Features

| Feature            | ¿MVP? | Fase     | Owner    | Notas                    |
| ------------------ | ----- | -------- | -------- | ------------------------ |
| Autenticación      | Sí    | MVP      | Backend  | JWT-based                |
| Dashboard          | Sí    | MVP      | Frontend | Core metrics             |
| Reportes Avanzados | No    | Post-MVP | -        | Depende de data pipeline |

## Exclusiones Explícitas

Lista exacta de lo que queda fuera del MVP y la justificación técnica.

| Feature Excluida | Justificación                                   |
| ---------------- | ----------------------------------------------- |
| Feature X        | Requiere integración con terceros no disponible |

## Definition of Done (DoD)

Para dar una feature por completa:

- [ ] Tests unitarios con cobertura > 80%
- [ ] Linter pasa sin errores
- [ ] Types checks sin errores
- [ ] Code review aprobado
- [ ] Documentación actualizada

## 🔗 Referencias

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md)
- [🤝 Contratos de Interfaz](CONTRACTS.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](MODEL.md)
- [🗺️ Roadmap de Producto](ROADMAP.md)
```

## Reglas

- Clasificación binaria estricta: **MVP** o **Alcance Futuro / Post-MVP**.
- No uses la palabra "Beta".
- Incluye Definition of Done con checkboxes reales.
