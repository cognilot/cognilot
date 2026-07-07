# @Cognilot/sdk

## Cognilot Core Orchestration SDK

Cognilot Core Orchestration SDK es una biblioteca independiente, basada en ESM y multiplataforma para la detección, procesamiento y automatización de formularios web. Diseñada para ser utilizada en extensiones de navegador y aplicaciones web, proporciona un motor de orquestación robusto para la resolución de campos mediante IA y reglas locales.

### ✨ Características (Features)

- **Detección Extensiva**: Motor de detección (DetectionEngine) para el escaneo de páginas y formularios con soporte para plataformas universales.
- **Resolución de Alias Local**: `AliasResolver` para la resolución inmediata de campos basada en caché local de aprendizaje previo.
- **Orquestación de Acciones**: `ActionEngine` para la ejecución de flujos complejos de llenado de formularios e interacciones con el DOM.
- **Intuitiva Sugerencia y Decisión**: Motores especializados (`SuggestionEngine` y `DecisionEngine`) para el autocompletado de texto y selección de opciones.
- **Arquitectura de Adaptadores**: Capa de abstracción para almacenamiento, mensajería, autenticación y gestión de configuración.
- **Plataformas Modulares**: Soporte nativo para `WebPlatform` (Navegador) con capacidad de extensión a otros entornos.
- **Políticas de Acceso**: `PlanGuard` integrado para la validación y restricción de funcionalidades según el plan del usuario (Free vs Pro).

### 🛠️ Tecnologías (Technologies)

- **TypeScript (^5.0.0)**: Código fuente 100% tipado para máxima seguridad y mantenibilidad.
- **Vite (^5.0.0)**: Herramienta de construcción para bundling optimizado en formatos ESM, CJS y UMD.
- **Vitest (^1.0.0)**: Entorno de pruebas unitarias de alto rendimiento.
- **JSDOM (^29.0.1)**: Simulación de entorno DOM para pruebas fuera del navegador.
- **ESM (ECMAScript Modules)**: Arquitectura nativa y moderna para la importación y exportación de módulos.

### 📋 Prerrequisitos (Prerequisites)

- **Node.js**: Versión LTS (Long Term Support) recomendada.
- **npm**: Gestor de paquetes oficial incluido con Node.js.
- **Navegador compatible**: Chrome, Firefox o Edge (para el uso final del SDK).

### 📦 Dependencias (Dependencies)

| Dependencia     | Versión | Licencia   | Propósito                                              |
| :-------------- | :------ | :--------- | :----------------------------------------------------- |
| vite            | ^5.0.0  | MIT        | Bundling, dev server y empaquetado del SDK.            |
| vitest          | ^1.0.0  | MIT        | Suite de pruebas unitarias e integración.              |
| jsdom           | ^29.0.1 | MIT        | Simulación de DOM para entornos de testing CI/CD.      |
| typescript      | ^5.0.0  | Apache-2.0 | Tipado estático y compilación de módulos modernos.     |
| vite-plugin-dts | ^3.0.0  | MIT        | Generación de archivos de definición de tipos (.d.ts). |

### 📁 Estructura del Proyecto (Project Structure)

```text
Cognilot-sdk/
├── src/                    # Código fuente principal
│   ├── adapters/           # Adaptadores de host (Storage, Auth, DOM)
│   ├── core/               # Lógica de negocio (Alias, Profile, Settings)
│   ├── engines/            # Motores de ejecución especializados
│   │   ├── action/         # Flujos de interacción y llenado
│   │   ├── autocomplete/   # Sugerencias por IA y decisiones
│   │   └── detection/      # Escaneo y descubrimiento de campos
│   ├── platforms/          # Adaptación a la plataforma host (Web)
│   ├── contracts/          # Definiciones de interfaces y modelos de datos
│   └── index.ts            # Punto de entrada y Facade del SDK
├── tests/                  # Pruebas automatizadas de la biblioteca
├── dist/                   # Salida de construcción (ESM, CJS, UMD)
├── package.json            # Metadatos y gestión de dependencias
├── tsconfig.json           # Configuración del compilador TypeScript
└── vite.config.ts          # Orquestación de construcción de Vite
```

### 📞 Contacto (Contact)

- **Cliente**: Cognilot Organization
- **Proveedor de Servicio**: Cognilot Engineering Team
- **Desarrollador**: Cognilot Org Development Group

📚 **Para documentación extendida y guías detalladas, consulta la Wiki del proyecto en GitHub.**
