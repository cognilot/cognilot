---
name: docs-suite-creator
description: Act as an Expert Software Architect and Tech Lead to analyze a project context, generate or update a complete technical and product documentation suite of 6 key files (ARCHITECTURE.md, CONTRACTS.md, DATABASE.md, MODEL.md/LOGIC.md, ROADMAP.md, SCOPE.md), and commit/push the documentation changes safely using Git and Conventional Commits. Use this skill whenever the user requests a documentation plan, wants to structure documentation for a new or existing repository, or specifically mentions creating these 6 files.
---

# 🏗️ Documentation Suite Creator

This skill enables the agent to act as an Expert Software Architect and Tech Lead to structure, analyze, and generate a cohesive, production-grade documentation suite of exactly 6 Markdown (.md) files for any software project.

---

## 🚀 Workflow

### Step 1: Context Analysis & Interview

Before writing any document, analyze the project:

1. Examine the root files, directory structure, active technologies, and codebases.
2. Identify the core logic or machine learning components (if any).
3. If anything is ambiguous, ask the user to clarify specific design or architectural details.

### Step 2: Generation of the 6 Documentation Files

Generate or update the following files using the templates and structures below. By default, generate them in the language requested by the user (defaulting to technical Spanish or English).

### Step 3: Verification, Commit & Push (Lightweight Git Workflow)

After generating or updating the files:

1. **Verify relative links:** Verify that all cross-references in the `## 🔗 Referencias` section of each file are correct relative links.
2. **Commit changes:** Stage the modified or new files and commit them using Conventional Commits with the `docs` prefix (e.g., `docs(scope): update technical architecture and database models`).
3. **Pull and Push:** Run `git pull --rebase` (or `git fetch` and merge) to pull any remote updates and prevent rejected pushes. Since only Markdown (`.md`) files are modified, you can skip heavy code validations (such as unit tests, linters, or creating pull requests) and push directly to the default branch (e.g., `master` or `main`).

---

## 📋 Strict Style and Terminology Rules

1. **Cero Ambiguidad (MVP vs Post-MVP):**
   - Do NOT use the word "Beta" in `ARCHITECTURE.md`, `CONTRACTS.md`, `DATABASE.md`, `MODEL.md`/`LOGIC.md`, or `SCOPE.md`.
   - Classify all features, code, and tables using a strict binary classification: **"MVP"** (current development scope) or **"Alcance Futuro / Post-MVP"** (excluded scope).
2. **The "Beta" Exception:**
   - The word "Beta" (Private or Public) is ONLY allowed in `ROADMAP.md` to describe the release strategy to users. It must never be used to define code sprints or MVP deliverables.
3. **Language & Aesthetics:**
   - Direct, technical language.
   - Start the main heading (`#`) of each document with a single representative emoji (e.g., `# 🏗️ Arquitectura Técnica`).
4. **Diagrams and Tables:**
   - Use `mermaid` blocks for system architectures, flowcharts, Gantt charts, and ERDs.
   - Use Markdown tables for data dictionaries and feature scope matrices.
5. **Cross References:**
   - Every file must end with a `## 🔗 Referencias` section containing relative links to the other files in the suite. Do not use absolute `file:///` paths.
6. **Architectural Decisions:**
   - Use blockquotes (`> **Decisión:** ...`) to explain critical technical decisions, trade-offs, and justifications.

---

## 📄 File Templates and Guidelines

### 1. `ARCHITECTURE.md` (🏗️ Arquitectura Técnica)

- **Architecture Diagram:** A high-level system components diagram using Mermaid.
- **Data Flow:** Clear End-to-End data flows (e.g., separating online/sychronous flows from offline/batch flows).
- **Environments & Deployment:** A table or breakdown of the target cloud platforms, databases, and continuous integration strategies.
- **References:** Relative links at the end.

### 2. `CONTRACTS.md` (🤝 Contratos de Interfaz)

- **Authentication:** Describe JWT, API keys, or Session access rules.
- **Endpoints:** Explicit HTTP contracts (Method, Path, Request Body, Response JSON, HTTP Status Codes).
- **Security & Access Policies:** Explicit security middleware or Row Level Security (RLS) rules.
- **References:** Relative links at the end.

### 3. `DATABASE.md` (🗄️ Modelo de Base de Datos)

- **ERD Diagram:** An entity-relationship diagram using Mermaid (`erDiagram`).
- **Data Dictionary:** Tables detailing Field, Type, Constraints, and Description.
- **MVP vs Post-MVP separation:** Explicitly separate tables or fields that belong to future scopes.
- **References:** Relative links at the end.

### 4. `MODEL.md` or `LOGIC.md` (🧠 Lógica Core / Modelo / Inferencia)

- **Core Logic/Math:** Detailed explanation of the primary business algorithms, formulas (using LaTeX notation if mathematical, e.g., \(A = B \times C\)), or ML models (embeddings, thresholds).
- **Execution Flowchart:** A Mermaid flowchart showing the logical step-by-step processing of data.
- **Inputs/Outputs:** Structural formats of what the logic expects and produces.
- **References:** Relative links at the end.

### 5. `ROADMAP.md` (🗺️ Roadmap de Producto)

- **Visual Timeline:** Mermaid `gantt` or structured timeline of the development phases.
- **Phases Breakdown:**
  - MVP (Engineering & Core validation)
  - Beta Release (Distribution & UX validation)
  - Retention Phase (Additional features & engagement)
  - Scale & Monetization (B2B, Integrations, optimizations)
- **References:** Relative links at the end.

### 6. `SCOPE.md` (🎯 Alcance MVP)

- **Feature Control Matrix:** A detailed table columns: `Feature`, `In MVP? (Yes/No)`, `Phase`, `Owner`, and `Notes`.
- **Explicit Exclusions:** List exactly what is out of the MVP scope and the technical justification.
- **Definition of Done (DoD):** Concrete checks (unit test coverage, passing lint, types checked) required to declare a feature complete.
- **References:** Relative links at the end.

---

## 🔗 Referencias Cruzadas (Ejemplo)

```markdown
## 🔗 Referencias

- [🏗️ Arquitectura Técnica](ARCHITECTURE.md)
- [🤝 Contratos de Interfaz](CONTRACTS.md)
- [🗄️ Modelo de Base de Datos](DATABASE.md)
- [🧠 Lógica Core e Inferencia](MODEL.md)
- [🗺️ Roadmap de Producto](ROADMAP.md)
- [🎯 Alcance MVP](SCOPE.md)
```
