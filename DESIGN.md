---
name: Cognilot Design System
version: 2.0.0
description: >
  Modern Dark Minimalist with subtle terminal signature accents.
  Clean SaaS readability with high visual hierarchy, dark void foundations, and developer-grade precision.
identity: dark-minimalist-terminal-signature
colors:
  bg-void: '#050505'
  bg-background: '#050505'
  bg-surface: 'rgba(255,255,255,0.03)'
  bg-surface-hover: 'rgba(255,255,255,0.06)'
  bg-surface-active: 'rgba(255,255,255,0.08)'
  bg-surface-elevated: '#0a0a0f'
  bg-overlay: 'rgba(5,5,5,0.85)'
  bg-blob-violet: 'rgba(139,92,246,0.10)'
  bg-blob-cyan: 'rgba(6,182,212,0.08)'
  accent-violet: '#8b5cf6'
  accent-cyan: '#06b6d4'
  text-white: '#f8f9fa'
  text-dim: 'rgba(255,255,255,0.70)'
  text-ghost: 'rgba(255,255,255,0.40)'
  text-phantom: 'rgba(255,255,255,0.15)'
  border-strong: 'rgba(255,255,255,0.15)'
  border-soft: 'rgba(255,255,255,0.10)'
  border-subtle: 'rgba(255,255,255,0.05)'
  success: '#10b981'
  warning: '#f59e0b'
  error: '#ef4444'
typography:
  primary:
    fontFamily: 'var(--font-sans), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    fontSize: '14px'
    lineHeight: '1.5'
    note: 'Global default for body, headings, navigation, forms, and buttons'
  mono:
    fontFamily: 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace'
    fontSize: '13px'
    lineHeight: '1.6'
    note: 'Reserved for logotype, shortcuts (<kbd>), badges, code, and technical metadata'
  billboard:
    fontFamily: 'var(--font-sans), Inter, sans-serif'
    fontSize: 'clamp(3rem, 7vw, 5.5rem)'
    fontWeight: '800'
    letterSpacing: '-0.03em'
    lineHeight: '0.95'
    note: 'Hero H1 billboard scale'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  full: '9999px'
spacing:
  section-x: 'px-6 md:px-12 lg:px-20'
  section-x-inner: 'px-10 md:px-20'
  section-y-major: 'py-28 md:py-36'
  section-y-minor: 'py-16 md:py-24'
  section-bar: 'py-6'
components:
  ambient-blob:
    size: '500px–600px'
    blur: 'blur-[120px]'
    opacityViolet: '10%'
    opacityCyan: '8%'
    position: fixed
  spine:
    width: '1px'
    color: 'rgba(255,255,255,0.10)'
    position: fixed
  feature-card:
    background: 'rgba(255,255,255,0.03)'
    borderTop: '2px solid {colors.accent-cyan}'
    borderOther: '1px solid rgba(255,255,255,0.06)'
    borderRadius: '{rounded.lg}'
    hoverBackground: 'rgba(255,255,255,0.05)'
    padding: '28px'
  button-primary:
    background: '#ffffff'
    textColor: '#050505'
    hoverBackground: '#e5e5e5'
    borderRadius: '{rounded.md}'
  button-terminal:
    background: 'rgba(255,255,255,0.04)'
    backgroundHover: 'rgba(255,255,255,0.08)'
    border: '1px solid rgba(255,255,255,0.12)'
    textColor: '{colors.text-white}'
    borderRadius: '{rounded.md}'
  button-ghost:
    background: transparent
    textColor: '{colors.text-dim}'
    textColorHover: '{colors.text-white}'
---

## Overview

**Modern Dark Minimalist with subtle terminal signature accents.**

Cognilot combines the sleek, high-readability aesthetics of modern productivity software (Linear, Raycast, Cursor) with a subtle developer-centric signature (`> cognilot_` brandmark, selective JSDoc comment accents in the Hero, keyboard shortcut badges `<kbd>`, and precise status indicators).

The design eliminates retro-terminal clutter (raw bash scripts, ASCII command trees, 100% monospace bodies, and markdown-file headers) in favor of high visual hierarchy, clean card layouts, and dual-typography contrast.

---

## Colors

| Token                 | Value                    | Usage                                          |
| :-------------------- | :----------------------- | :--------------------------------------------- |
| `bg-background`       | `#050505`                | Absolute void background                       |
| `bg-surface`          | `rgba(255,255,255,0.03)` | Cards, panels, inputs                          |
| `bg-surface-hover`    | `rgba(255,255,255,0.06)` | Hover state on cards, rows, buttons            |
| `bg-surface-elevated` | `#0a0a0f`                | Elevated dropdowns, modals, sidebars           |
| `accent-violet`       | `#8b5cf6`                | Brand `>` prefix, active indicators, Pro tier  |
| `accent-cyan`         | `#06b6d4`                | Cursor `_`, active tabs, secondary highlights  |
| `text-white`          | `#f8f9fa`                | Primary headings, active labels, high contrast |
| `text-dim`            | `rgba(255,255,255,0.70)` | Body text, descriptions, secondary items       |
| `text-ghost`          | `rgba(255,255,255,0.40)` | Form hints, inactive tabs, metadata            |
| `text-phantom`        | `rgba(255,255,255,0.15)` | Placeholders, disabled states                  |
| `border-strong`       | `rgba(255,255,255,0.15)` | Active borders, nav dividers                   |
| `border-soft`         | `rgba(255,255,255,0.10)` | Card borders, sidebar dividers                 |
| `border-subtle`       | `rgba(255,255,255,0.05)` | Internal list dividers, grid lines             |
| `success`             | `#10b981`                | Positive status, saved notifications           |
| `warning`             | `#f59e0b`                | Warnings, rate-limit warnings                  |
| `error`               | `#ef4444`                | Errors, destructive actions                    |

---

## Typography

Cognilot uses a **dual-typography system**:

### 1. Sans-Serif Primary (`font-sans`: Geist / Inter)

Used for **90% of the UI** to guarantee maximum readability and clean SaaS visual weight:

- Page headings, section titles, subheadings
- Body copy, instructions, marketing descriptions
- Navigation items, buttons, form labels, inputs
- Tables, pricing cards, settings options

### 2. Monospace Secondary (`font-mono`: Geist Mono / JetBrains Mono)

Used **strictly for technical signature accents**:

- Brand logotype: `> cognilot_`
- Hero section JSDoc comment description `/** ... */`
- Keyboard shortcuts: `<kbd>Alt + /</kbd>`
- System badges and versioning: `v0.6.5`, `PRO`, `FREE`
- API keys, token counters, JSON previews, DOM selectors

### Typographic Scale

- **Billboard H1**: `font-sans font-extrabold text-4xl sm:text-6xl md:text-7xl tracking-tight leading-[1.05]`
- **Section H2**: `font-sans font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight text-white`
- **Card Title H3**: `font-sans font-semibold text-base sm:text-lg text-white`
- **Body Regular**: `font-sans text-sm sm:text-base text-dim leading-relaxed`
- **Caption / Meta**: `font-sans text-xs text-ghost`
- **Mono Accent**: `font-mono text-xs uppercase tracking-wider`

---

## Layout

### Marketing Layout

- **Root Background**: `#050505` with 2 fixed ambient background blobs (`violet-500/10` and `cyan-500/8`).
- **Vertical Spines**: 2 fixed `1px` subtle lines at `left-6 md:left-12 lg:left-20` and `right-6 md:right-12 lg:right-20` to frame marketing sections.
- **Section Structure**: Outer `px-6 md:px-12 lg:px-20 py-28 md:py-36` with inner `px-10 md:px-20` content container.

### Dashboard Layout (Web App)

- **Viewport Constraints**: `h-screen overflow-hidden flex bg-background`
- **Sidebar**: Fixed `h-screen w-64 shrink-0 flex flex-col border-r border-white/10 bg-surface/50 backdrop-blur-md`
- **Main Content**: `flex-1 h-screen overflow-y-auto p-6 md:p-10`

---

## Elevation & Depth

- **Void Depth**: Near-black void `#050505` sits beneath all panels.
- **Surface Elevation**: Cards use translucent `rgba(255,255,255,0.03)` with `1px border-white/10`.
- **Backdrop Blur**: `backdrop-blur-md` or `backdrop-blur-xl` applied on sticky navbars and modal overlays.

---

## Shapes

- **sm (`4px`)**: Badges, tags, shortcut `<kbd>` keys.
- **md (`8px`)**: Buttons, inputs, dropdown items.
- **lg (`12px`)**: Feature cards, dashboard panels, modal containers.
- **xl (`16px`)**: Large dashboard workbench modules, preview containers.
- **full (`9999px`)**: Status dots, pill badges, user avatars.

---

## Components

### 1. Modern Marketing Footer

Clean SaaS 3-column layout:

- **Col 1 (Brand)**: `> cognilot_` logo + tagline + copyright.
- **Col 2 (Product & Resources)**: Features, Chrome Web Store, Documentation, API.
- **Col 3 (Legal & Company)**: Privacy Policy, Terms of Service, Support contact.

### 2. Feature Cards

- Border top accent: `border-t-2 border-accent-cyan` or `border-accent-violet`.
- Flat translucent container: `bg-surface border border-white/5 rounded-lg p-6 hover:bg-white/[0.05] transition-all`.

### 3. Dashboard Page Header

Replaces `# filename.md` with:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
  <div>
    <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
    <p className="text-sm text-white/50 mt-1">{description}</p>
  </div>
  {action && <div>{action}</div>}
</div>
```

---

## Do's and Don'ts

### ✅ Do

- Use `font-sans` for all readable text, titles, forms, navigation, and buttons.
- Use `font-mono` exclusively for code, `<kbd>` badges, logs, and brand signatures.
- Keep the Cognilot logo monochrome pure white (`> cognilot_` / `< cognilot_`) without split accent colors.
- Keep the JSDoc comment `/** ... */` as a signature element in the Hero subtext.
- Maintain a locked `100vh` layout with independent scroll in the dashboard.
- Use clean modern CTA labels ("Get Started", "Install Extension", "Save Changes") without redundant `>` or `<` symbols.
- Style accordions with generous spacing (`py-7 sm:py-8`), clean white dividers (`border-b border-white/10`), and pure white `+` / `−` indicators.

### ❌ Don't

- Use `font-mono` on entire page layouts or body paragraphs.
- Use multi-colored split accents on the brand logo symbols.
- Add redundant `>` or `<` symbols to buttons (`Get Started >`, `> Continue with Email`).
- Use bash script button labels like `./run.sh`, `./get_started.sh`, `./sign_out.sh`.
- Use markdown file headers like `# plan.md` or `# settings.md` as page titles.
- Let the dashboard sidebar expand or lose sticky anchoring when page content grows.
