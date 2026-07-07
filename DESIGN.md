---
name: Cognilot Terminal
version: alpha
description: A developer-centric, IDE-inspired design system for Cognilot.
colors:
  primary: '#050505'
  brand-violet: '#8b5cf6'
  brand-cyan: '#06b6d4'
  text-main: '#f8f9fa'
  text-dim: '#b8bcc8'
  text-ghost: '#6b7280'
  success: '#10b981'
  warning: '#f59e0b'
  error: '#ef4444'
  info: '#3b82f6'
typography:
  primary:
    fontFamily: 'Inter, sans-serif'
    fontSize: 14px
  mono:
    fontFamily: 'JetBrains Mono, monospace'
    fontSize: 13px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
components:
  window:
    backgroundColor: '{colors.primary}'
    rounded: '{rounded.xl}'
    border: '1px solid rgba(255, 255, 255, 0.1)'
  button-primary:
    backgroundColor: '{colors.brand-violet}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
  input:
    backgroundColor: 'transparent'
    borderBottom: '1px solid {colors.text-ghost}'
---

## Overview

Architectural Minimalism meets Developer Utility. The UI evokes a premium IDE or Terminal experience — focused on text, code-like syntax, and deep contrast.

## Colors

The palette is rooted in absolute blacks and vibrant accent colors that simulate code highlighting.

- **Primary (#050505):** Deep void for backgrounds.
- **Brand Violet (#8b5cf6):** Main accent for headers and primary highlights.
- **Brand Cyan (#06b6d4):** Secondary accent for active states and values.
- **Text Main (#f8f9fa):** High legibility off-white.

## Typography

- **Primary (Inter):** Used for interface labels and long-form text.
- **Mono (JetBrains Mono):** The backbone of the application. Used for all data, inputs, and code-like elements.

## Shapes

We use a structured corner radius scale (`rounded` tokens) to establish visual hierarchy:

- **Small (4px):** Applied to compact components like tags and badges.
- **Medium (8px):** Applied to standard interactive elements like buttons and inputs.
- **Large (12px):** Reserved for card containers and smaller popovers.
- **Extra Large (16px):** Reserved for primary window outlines and modal interfaces.

## Components

- **window:** Implements the main dark container using the primary color (`{colors.primary}`) with rounded corners (`{rounded.xl}`) and a subtle border.
- **button-primary:** High-contrast action button colored in brand violet (`{colors.brand-violet}`) with white text.
- **input:** Uncluttered form input with a transparent background and a clean bottom border using the ghost text color (`{colors.text-ghost}`).

## Do's and Don'ts

### Do:

- **Text is UI:** Rely on spacing and typography rather than heavy containment boxes.
- **Syntactic Sugar:** Use symbols like `#`, `//`, `[ ]`, and `>` as functional visual cues.
- **Mono Typography:** Use JetBrains Mono as the default font for values, tags, data blocks, and code-like elements.

### Don't:

- **Overuse Containment:** Avoid adding multiple nested background panels or borders.
- **Unnecessary Blur:** Use `backdrop-blur` only on floating overlay elements (like dialogs/dropdowns) to maintain user focus.
