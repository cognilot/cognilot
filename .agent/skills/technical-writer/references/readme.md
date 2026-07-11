# Template: README.md

Usa esta plantilla cuando el usuario solicite crear o actualizar `README.md` en la raíz del proyecto.

## Estructura

```markdown
# {Project Name}

{Descripción breve del propósito principal del proyecto}

## ✨ Características

- {Feature 1 verificada en el código}
- {Feature 2 verificada en el código}
- {Feature 3 verificada en el código}

## 🛠️ Tecnologías

- {Tecnología 1} {versión}
- {Tecnología 2} {versión}
- {Tecnología 3} {versión}

## 📋 Prerrequisitos

- {Runtime} {versión mínima}
- {Package manager} {versión mínima}

## 📦 Dependencias

| Dependencia | Versión | Licencia     | Propósito   |
| ----------- | ------- | ------------ | ----------- |
| {dep1}      | {x.y.z} | {MIT}        | {propósito} |
| {dep2}      | {x.y.z} | {Apache-2.0} | {propósito} |

_Tabla limitada a las 15-20 dependencias principales._

## 📁 Estructura del Proyecto
```

{project-name}/
├── src/
│ ├── {subdir}/
│ │ └── {file}.ts
│ └── index.ts
├── tests/
├── package.json
└── README.md

```

## 📞 Contacto

- **Cliente:** {cliente verificado}
- **Proveedor:** {proveedor verificado}
- **Desarrollador:** {desarrollador verificado}

---

📚 **Para documentación extendida y guías detalladas, consulta la Wiki del proyecto en GitHub.**
```

## Reglas Estrictas

- **NO** enlaces externos (shields.io, descargas, sitios externos).
- **NO** assumptions — si no está en el código o config, omítelo.
- **NO** puertos, rutas locales, o URLs internas.
- **NO** assets externos (badges, logos, imágenes de servicios externos).
- **NO** herramientas no confirmadas — solo lo que está en dependencias.
- **100% Verificable** — cada palabra respaldada por archivos en el workspace.
- Fuentes de información: `package.json`, configs, código fuente, estructura de directorios real.
