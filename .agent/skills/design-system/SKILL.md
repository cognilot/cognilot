---
name: Cognilot Terminal Design System
description: Comprehensive guidelines for creating UI in Cognilot. Identity = Modern Dark Minimalist with subtle terminal signature accents. Dual-typography system (Sans primary, Mono secondary).
---

# Cognilot Design System

> **Canonical Reference:** The **Home marketing page** (`/home`) and the updated **Dashboard** (`/memory`, `/plan`, `/settings`, `/playground`) define the standard. Every new page, section, and component must adhere to this unified design language.

---

## 1. Core Identity

**Modern Dark Minimalist with subtle terminal signature accents.**

Cognilot is a high-performance AI autofill product. It combines the clean readability of modern developer tools (Linear, Raycast, Cursor) with selected terminal signatures (`> cognilot_` brandmark, JSDoc comment in Hero subtext, `<kbd>` shortcut badges, and subtle code indicators).

### What this means

- **High visual hierarchy & clean typography**: Primary font is modern sans-serif (`Geist Sans` or `Inter`) for 90% of copy, headings, and controls.
- **Monospace as signature, not blanket system**: Monospace (`Geist Mono` or `JetBrains Mono`) is reserved for the brand logo `> cognilot_`, the Hero JSDoc comment, keyboard shortcuts `<kbd>`, and system data.
- **Modern buttons and actions**: Clean, conventional buttons (`Get Started`, `Save Changes`, `Sign Out`) with crisp micro-interactions. No bash scripts (`./run.sh`).
- **Clean SaaS navigation and footer**: Professional layout structure without ASCII command trees or retro terminal gimmicks.
- **Accents (Violet `#8b5cf6` & Cyan `#06b6d4`)**: Used strategically for brand accents, active indicators, and focus states.

### Strictly forbidden

- Using `font-mono` globally on `<body>` or on general body paragraphs and headings.
- Multi-colored split accents on brand logo symbols (logo must be pure monochrome white).
- Redundant `>` or `<` symbols inside buttons (`Get Started >`, `> Continue with Email`).
- Script-based button labels like `./get_started.sh` or `./sign_out.sh`.
- File-based page titles like `# memory.md` or `# settings.md`.
- Solid bright backgrounds (white, gray-100) as full-section fills.

---

## 2. Background & Layout System

### Root Background

- Near-black void `#050505` (`bg-background`).
- Ambient background lights: Two blurred radial blobs (`bg-violet-500/10` and `bg-cyan-500/8` with `blur-[120px]`).

### Marketing Layout

- Vertical 1px spines at margin positions (`left-6 md:left-12 lg:left-20` and `right-6 md:right-12 lg:right-20`).
- Section padding: outer `px-6 md:px-12 lg:px-20 py-28 md:py-36`, inner `px-10 md:px-20`.

### Dashboard Layout

- Locked container: `h-screen overflow-hidden flex bg-background text-foreground`
- Sidebar: Fixed `h-screen w-64 shrink-0 flex flex-col border-r border-white/10 bg-surface/50 backdrop-blur-md`
- Main Content: `flex-1 h-screen overflow-y-auto p-6 md:p-10`

---

## 3. Typography Rules

| Role                           | Font Family                     | Usage                                                                   |
| :----------------------------- | :------------------------------ | :---------------------------------------------------------------------- |
| **Primary Sans (`font-sans`)** | `Geist Sans` / `Inter`          | 90% of UI: Page headings, descriptions, buttons, forms, tables, nav     |
| **Mono Accent (`font-mono`)**  | `Geist Mono` / `JetBrains Mono` | Logo `> cognilot_`, Hero JSDoc `/** ... */`, `<kbd>` keys, badges, code |

---

## 4. Components & Tokens

- **Feature Cards**: `bg-surface border-t-2 border-accent-cyan border-x border-b border-white/5 rounded-lg p-6 hover:bg-white/[0.05] transition-all`.
- **Page Header**: Clean title in `font-sans font-bold text-2xl text-white`, subtitle in `text-sm text-white/50`, and clean action slot.
- **Buttons**:
  - `variant="default"` (Solid white with dark text, primary CTA)
  - `variant="terminal"` (Dark surface with subtle border and `>` accent prefix)
  - `variant="ghost"` (Transparent with subtle hover)
