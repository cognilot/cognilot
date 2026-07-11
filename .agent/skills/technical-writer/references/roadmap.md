# Template: ROADMAP.md

Usa esta plantilla cuando el usuario solicite crear o actualizar `ROADMAP.md` en `docs/`.

## Estructura

````markdown
# 🗺️ Roadmap de Producto

## Línea de Tiempo

```mermaid
gantt
    title Roadmap
    dateFormat  YYYY-MM-DD
    section MVP
    Feature 1           :a1, 2025-01-01, 30d
    Feature 2           :a2, after a1, 20d
    section Beta
    Beta Privado        :b1, after a2, 30d
    Beta Público        :b2, after b1, 30d
    section Retención
    Feature 3           :c1, after b2, 30d
    section Escalado
    Feature 4           :d1, after c1, 45d
```
````

```

## Fases

### Fase 1: MVP (Ingeniería y Validación Core)
| Feature | Descripción | Prioridad |
|---|---|---|
| Feature A | Descripción | Alta |

### Fase 2: Beta (Distribución y UX)
| Hito | Descripción | Fecha Estimada |
|---|---|---|
| Beta Privado | Acceso controlado | Q1 2025 |

### Fase 3: Retención (Features Adicionales)
| Feature | Descripción |
|---|---|
| Feature C | Descripción |

### Fase 4: Escalado y Monetización
| Iniciativa | Descripción |
|---|---|
| B2B | APIs empresariales |

## 🔗 Referencias

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md)
- [🤝 Contratos de Interfaz](CONTRACTS.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](MODEL.md)
- [🎯 Alcance MVP](SCOPE.md)
```

## Reglas

- Usa Mermaid `gantt` para la línea de tiempo visual.
- La palabra "Beta" SOLO está permitida aquí para describir la estrategia de release.
- No uses "Beta" para definir código sprints o deliverables MVP.
