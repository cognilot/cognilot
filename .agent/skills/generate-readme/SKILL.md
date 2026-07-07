---
name: Professional README Generator
description: A specialized skill for generating standardized, professional, and 100% verifiable README.md files based on real project analysis.
---

# Professional README Generator Skill

This skill provides a strict protocol for generating a `README.md` file that is professional, clean, and entirely based on verifiable project data. It enforces a specific structure and set of clinical restrictions to ensure high-quality documentation.

## 📋 Mandatory Structure

The generated `README.md` MUST follow this exact sequence:

1.  **Title**: Project Name with clear hierarchy.
2.  **Description**: Brief summary of the project's primary function.
3.  **✨ Características (Features)**: List of confirmed features.
4.  **🛠️ Tecnologías (Technologies)**: List of base technologies and versions.
5.  **📋 Prerrequisitos (Prerequisites)**: Environment requirements.
6.  **📦 Dependencias (Dependencies)**: A table with Columns: [Dependencia, Versión, Licencia, Propósito]. Limit to top 15-20.
7.  **📁 Estructura del Proyecto (Project Structure)**: A real directory tree showing the main files/folders.
8.  **📞 Contacto (Contact)**: Verified Cliente, Service Provider, and Developer.
9.  **Footer**: Exactly: "📚 **Para documentación extendida y guías detalladas, consulta la Wiki del proyecto en GitHub.**"

## 🚫 Strict Restrictions

To maintain professionalism and accuracy, you MUST adhere to these rules:

- ❌ **NO External Links**: Do not use links for shields.io, downloads, or external websites.
- ❌ **NO Assumptions**: Never invent or "fill in" information. If it’s not in the code or config, omit it.
- ❌ **NO Technical Over-configuration**: Do not include specific ports, local paths, or internal URLs.
- ❌ **NO External Assets**: No external badges, logos, or images from external services.
- ❌ **NO Unconfirmed Tools**: Only mention tools/libraries explicitly present in the dependency files.
- ✅ **100% Verifiable**: Every word must be backed by files in the current workspace.

## 🔍 Information Sources

Actively search and verify data from:

- `build.gradle`, `pom.xml`, `package.json`, `requirements.txt`, etc. (for versions).
- `application.yml`, `application.properties`, `.env.example` (for config context).
- Source code headers and comments (for contact/author info).
- Actual directory structure (`ls -R` or `list_dir`).

## 🛠️ Work Process (Execution Protocol)

When this skill is invoked, you MUST follow these steps:

1.  **Deep Scan**: Run `list_dir` on the root and key subdirectories to understand the architecture.
2.  **Dependency Analysis**: Read the primary dependency management file to extract versions and licenses.
3.  **Config Extraction**: Review configuration files to define prerequisites and features.
4.  **Identity Search**: Search code headers (e.g., using `grep_search`) for "Client", "Author", or "Service Provider".
5.  **Drafting**: Construct the README using the required emojis (✨ 🛠️ 📋 📦 📁 📞) and tables.
6.  **Verification**: Cross-check the draft against the restrictions before finalizing.

## 📝 Required Formatting Details

- **Emojis**: Use them specifically for headers as defined in the structure.
- **Dependencies Table**: Ensure columns are populated with verified data. Max 20 entries.
- **Directory Tree**: Use a code block with `tree` style formatting.
- **Tone**: Neutral, professional, and engineering-oriented.
