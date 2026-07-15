---
name: Cognilot Terminal
version: alpha
description: Developer-centric, IDE/Terminal-inspired design system for Cognilot. Every visual decision derives from the Memory view as the canonical reference.
colors:
  bg-void: '#050505'
  bg-primary: '#0a0a0f'
  bg-surface: 'rgba(255,255,255,0.03)'
  bg-surface-hover: 'rgba(255,255,255,0.05)'
  bg-overlay: 'rgba(5,5,5,0.80)'
  accent-violet: '#8b5cf6'
  accent-cyan: '#06b6d4'
  text-white: '#f8f9fa'
  text-dim: 'rgba(255,255,255,0.60)'
  text-ghost: 'rgba(255,255,255,0.30)'
  text-phantom: 'rgba(255,255,255,0.10)'
  border-soft: 'rgba(255,255,255,0.10)'
  border-faint: 'rgba(255,255,255,0.05)'
  success: '#10b981'
  warning: '#f59e0b'
  error: '#ef4444'
typography:
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '13px'
    lineHeight: '1.6'
  sans-label:
    fontFamily: 'Inter, ui-sans-serif, sans-serif'
    fontSize: '11px'
    textTransform: uppercase
    letterSpacing: '0.2em'
    fontWeight: '700'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  full: '9999px'
spacing:
  window-padding: '24px 32px'
  row-padding: '4px 16px'
  section-gap: '32px'
components:
  window:
    background: 'rgba(5,5,5,0.90)'
    backdropBlur: '2xl'
    border: '1px solid rgba(255,255,255,0.10)'
    borderRadius: '{rounded.xl}'
    shadow: 'shadow-2xl'
  window-titlebar:
    background: 'rgba(255,255,255,0.05)'
    borderBottom: '1px solid rgba(255,255,255,0.05)'
    padding: '16px 20px'
    dotRed: 'rgba(239,68,68,0.80)'
    dotYellow: 'rgba(234,179,8,0.80)'
    dotGreen: 'rgba(34,197,94,0.80)'
    filenameColor: 'rgba(255,255,255,0.30)'
  kv-row:
    labelColor: '{colors.accent-violet}'
    labelWidth: '160px–200px'
    separatorColor: 'rgba(139,92,246,0.50)'
    valueColor: '{colors.text-white}'
    hoverBackground: 'rgba(255,255,255,0.05)'
  button-sh:
    background: 'rgba(255,255,255,0.05)'
    backgroundHover: 'rgba(255,255,255,0.10)'
    border: '1px solid rgba(255,255,255,0.10)'
    textColor: '{colors.text-white}'
    prefix: '>'
    prefixColor: '{colors.accent-violet}'
  section-header:
    text: '## section_name'
    color: 'rgba(255,255,255,0.30)'
    fontSize: '11px'
    textTransform: uppercase
    letterSpacing: 'wider'
    fontWeight: '700'
---

## Overview

**Text is UI.** The Cognilot interface treats typography as its primary visual medium. Rather than boxes, cards, and filled backgrounds, structure is conveyed through code-like syntax, monospace rhythm, and deep contrast against a near-black void.

The **Memory view** is the canonical reference implementation. Every new page or component must visually derive from it.

---

## Core Aesthetic Principles

1. **Terminal / IDE metaphor** — The app looks like a running process inside a developer's terminal or a file open in an IDE, not a SaaS dashboard.
2. **Text density over visual decoration** — Prefer more information at smaller sizes over spaced-out cards with icons and gradients.
3. **Code syntax as chrome** — `#`, `##`, `//`, `>`, `[ ]`, `:`, `$`, `./` are not decorative; they carry semantic weight.
4. **Containment only when necessary** — One top-level `window` container per major content block. Never nest multiple `bg-*` layers.
5. **Monospace everywhere** — `font-mono` is the application default. `font-sans` is reserved for system labels, badges, and window titles only.

---

## Colors

The palette lives in extreme contrast — near-black backgrounds with neon accent punctuation.

| Token              | Value                    | Usage                                               |
| ------------------ | ------------------------ | --------------------------------------------------- |
| `bg-void`          | `#050505`                | Absolute root background                            |
| `bg-primary`       | `#0a0a0f`                | Default background for major window containers      |
| `bg-surface`       | `rgba(255,255,255,0.03)` | Subtle section fill inside a window                 |
| `bg-surface-hover` | `rgba(255,255,255,0.05)` | Row hover state                                     |
| `accent-violet`    | `#8b5cf6`                | Labels, `#` headings, `>` prefixes, primary accents |
| `accent-cyan`      | `#06b6d4`                | Values, active states, brackets `[]`, hyperlinks    |
| `text-white`       | `#f8f9fa`                | Active / important text                             |
| `text-dim`         | `rgba(255,255,255,0.60)` | Secondary data values                               |
| `text-ghost`       | `rgba(255,255,255,0.30)` | Section headers `## …`, metadata                    |
| `text-phantom`     | `rgba(255,255,255,0.10)` | Placeholders, disabled hints                        |
| `border-soft`      | `rgba(255,255,255,0.10)` | Window borders                                      |
| `border-faint`     | `rgba(255,255,255,0.05)` | Internal dividers, row separators                   |

### Do not use

- Hard-coded hex colors other than `#050505`
- Solid bright backgrounds (white, gray-100, etc.)
- TailwindCSS color utilities like `bg-gray-900` or `text-blue-500`

---

## Typography

Only **two font roles** exist in the entire application.

| Role               | Font           | Size                                  | Use                                                |
| ------------------ | -------------- | ------------------------------------- | -------------------------------------------------- |
| **Mono (default)** | JetBrains Mono | 13px                                  | All data, inputs, values, code blocks, body text   |
| **Sans label**     | Inter          | 10px–11px, uppercase, tracking-widest | Window titles, system badges, `## section` headers |

### Markdown-Style Heading Pattern

```
# Page Title       → text-xl font-bold text-white  (violet `#` prefix)
## section_label   → text-[11px] uppercase tracking-wider text-ghost font-sans font-bold
// inline comment  → text-[13px] text-dim font-mono italic
```

---

## Structural Components

### Window Container

The fundamental building block. Every major content area lives in exactly one window.

```tsx
<section className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
  {/* Title Bar */}
  <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2 select-none">
    <div className="flex gap-2 mr-4">
      <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
      <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
    </div>
    <div className="text-white/30 text-[11px] uppercase tracking-[0.2em] font-sans font-bold flex-1 justify-end flex">
      FILENAME.MD
    </div>
  </div>
  {/* Content */}
  <div className="p-6 md:p-8 font-mono text-[13px]">{children}</div>
</section>
```

### Section Header (Inside a Window)

```tsx
<div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px] font-sans">
  ## section_name
</div>
```

### Key–Value Row (The Core UI Pattern)

The **primary input / display pattern** — used for all data fields. No border boxes, no labels above inputs.

```tsx
<div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors group py-1">
  {/* Label */}
  <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
    field_name<span className="text-accent-violet/50">:</span>
  </span>
  {/* Value / Input */}
  <input className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors" />
</div>
```

---

## Interactive Elements

### Primary Action Button (Shell Script Style)

```tsx
<button
  className="py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors
                   flex items-center gap-2 border border-white/10 group font-bold"
>
  <span className="text-accent-violet opacity-50 group-hover:opacity-100 transition-opacity">
    {'>'}
  </span>
  ./action_name.sh
</button>
```

### Secondary / Toggle Action (Bracket Style)

```tsx
<button className="text-accent-cyan/80 hover:text-accent-cyan font-bold transition-colors">
  [ACTION]
</button>
```

### Danger Action

```tsx
<button
  className="border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded
                   py-2 px-4 text-[11px] font-bold transition-colors"
>
  EXECUTE DANGER_ACTION
</button>
```

### Reload / Utility Link

```tsx
<button className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5">
  <RefreshCw className="w-3.5 h-3.5" />
  [RELOAD]
</button>
```

---

## Empty States

```tsx
<div className="text-white/20 select-none py-8 border border-dashed border-white/5 rounded-lg text-center">
  // No entries found. Use the form above to add one.
</div>
```

---

## Loading States

```tsx
<div className="p-8 max-w-4xl mx-auto font-mono text-[13px] text-white/30 space-y-6 animate-pulse">
  <div>// scanning_database.sh...</div>
  <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
</div>
```

---

## Status Badges

Small inline labels using `font-sans uppercase tracking-widest text-[10px]`.

```tsx
{
  /* Active */
}
<span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-accent-cyan font-bold">
  [ACTIVE]
</span>;
{
  /* Category tag */
}
<span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/40 uppercase tracking-wide">
  general
</span>;
```

---

## Animations

- `animate-fade-in` — Page-level entry for all routes
- `animate-scale-in` — Window-level entry for modals and primary cards
- `transition-colors` — All hover/focus state changes
- **No** translate or slide animations unless simulating terminal output

---

## Do's and Don'ts

### ✅ Do

- **Text is UI**: Let spacing and typography carry the layout.
- **One window per section**: Never nest multiple dark background containers.
- **Syntactic Sugar**: Use `#`, `//`, `>`, `[ ]`, `$`, `./` as functional UI elements.
- **snake_case text**: All labels, field names, and identifiers use `snake_case` or `lowercase`.
- **Monospace default**: `font-mono` applies globally; only override for system labels.

### ❌ Don't

- **Overuse containment**: No nested `bg-*` panels inside windows.
- **Use shadcn inputs with borders**: No solid-border input boxes — use the KV row pattern.
- **Mix font roles**: Never use `font-sans` for body or data text.
- **Unnecessary blur**: `backdrop-blur` only on the primary window container, never on rows or sections.
- **Generic SaaS patterns**: No icon grids, no feature cards, no gradient hero sections.
