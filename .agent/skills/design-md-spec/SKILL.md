---
name: Google Labs DESIGN.md Specification
description: Guidelines and strict schema rules for creating and updating a spec-compliant DESIGN.md file in any project repository. Use this skill whenever the user mentions configuring design tokens, defining visual variables (colors, typography, spacing, rounded corners) for AI coding agents, or validating/updating DESIGN.md files based on Google Labs (Stitch project) standards.
---

# Google Labs DESIGN.md Specification

This skill enforces the official Google Labs (Stitch project) standard for defining visual design tokens and UI constraints within a `DESIGN.md` file at the root of a software repository.

AI coding agents use this file to parse and apply design tokens (colors, typography, shapes) directly into styling frameworks like Tailwind, CSS variables, or component properties.

---

## 1. Core Rule: Separation of Concerns

- **DESIGN.md** is strictly for **visual design tokens and UI rules**. It must _never_ contain codebase directory structures, database schemas, or server endpoint specs.
- **ARCHITECTURE.md** (located in `docs/ARCHITECTURE.md`) is for **codebase and system architecture**.

---

## 2. File Anatomy & Schema

A spec-compliant `DESIGN.md` consists of two distinct parts:

1.  **YAML Frontmatter**: Defines the raw tokens (colors, typography, rounded corners, layout spacing, components).
2.  **Markdown Prose**: Strict canonical sections explaining the design rationale for each token set.

### 2.1 YAML Token Schema

```yaml
---
name: Project Brand Name
version: alpha | beta | major.minor.patch
description: Short summary of the design aesthetic.
colors:
  primary: '#hex'
  secondary: '#hex'
  brand-accent: '#hex'
  text-main: '#hex'
  text-dim: '#hex'
  success: '#hex'
  warning: '#hex'
  error: '#hex'
typography:
  primary:
    fontFamily: 'FontName, fallback'
    fontSize: px/rem
  mono:
    fontFamily: 'FontName, monospace'
    fontSize: px/rem
rounded:
  sm: px/rem
  md: px/rem
  lg: px/rem
components:
  component-name:
    backgroundColor: '{colors.primary}'
    rounded: '{rounded.lg}'
---
```

### 2.2 Canonical Markdown Sections

Following the YAML block, you must structure the document using the following exact headings in this specific order:

1.  `## Overview`: Summary of the overall design aesthetic, theme, and brand target.
2.  `## Colors`: Breakdown of the color palette, accessibility/contrast rationale.
3.  `## Typography`: Specifications for primary and monospace font families and sizes.
4.  `## Layout`: Rules for spacing, padding, grids, and flex parameters.
5.  `## Elevation & Depth`: Shadow and layering guidelines.
6.  `## Shapes`: Corner radius hierarchies and bounding rules.
7.  `## Components`: Details of custom component styles and overrides.
8.  `## Do's and Don'ts`: Plain bulleted guidelines for implementation.

---

## 3. Best Practices & Validation Rules

1.  **Token References**: Within the YAML frontmatter, component values should reference core tokens using curly braces (e.g. `backgroundColor: "{colors.primary}"`) to maintain a single source of truth.
2.  **Contrast Compliance**: All primary component tokens must comply with WCAG AA standards (minimum contrast ratio of **4.5:1** for normal text, e.g., using white text on `#8b5cf6` violet is under 4.5:1, but on `#7c3aed` it is compliant).
3.  **Prose Alignment**: Every token type defined in the YAML (like `rounded`) must have a corresponding explanation section in the prose (like `## Shapes`).

---

## 4. Spec-Compliant Template

```markdown
---
name: Simple Template
version: 1.0.0
description: Monospace terminal design token system.
colors:
  primary: '#0a0a0a'
  accent: '#06b6d4'
  text-main: '#fafafa'
  text-muted: '#737373'
typography:
  primary:
    fontFamily: 'sans-serif'
    fontSize: 14px
  mono:
    fontFamily: 'monospace'
    fontSize: 13px
rounded:
  sm: 4px
  md: 8px
components:
  card:
    backgroundColor: '{colors.primary}'
    rounded: '{rounded.md}'
    border: '1px solid {colors.text-muted}'
---

## Overview

A dark, content-first interface optimizing workspace density.

## Colors

- **Primary (#0a0a0a)**: Main background void.
- **Accent (#06b6d4)**: Cyan highlighting for active/selected items.

## Typography

- **Primary**: Sans-serif for navigation.
- **Mono**: Monospace for all interactive inputs.

## Layout

We use a standard 4px/8px grid system for layout padding and margins.

## Elevation & Depth

Depth is created using solid borders instead of gradients or shadows.

## Shapes

- **sm (4px)**: Used for small tags.
- **md (8px)**: Standard rounded corners for content cards.

## Components

- **card**: A primary content holder utilizing primary backgrounds and muted borders.

## Do's and Don'ts

### Do:

- Use absolute dark backgrounds.
- Highlight values in accent cyan.

### Don't:

- Add nested cards or complex card elevation.
```
