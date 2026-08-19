---
name: Cognilot Design System
version: 1.0
description: >
  Dark Minimalist with a subtle terminal signature.
  The marketing site is the canonical reference and global standard for all product surfaces.
identity: dark-minimalist-terminal-signature
colors:
  bg-void: '#050505'
  bg-background: '#050505'
  bg-surface: 'rgba(255,255,255,0.03)'
  bg-surface-hover: 'rgba(255,255,255,0.05)'
  bg-overlay: 'rgba(5,5,5,0.80)'
  bg-blob-violet: 'rgba(139,92,246,0.10)'
  bg-blob-cyan: 'rgba(6,182,212,0.08)'
  accent-violet: '#8b5cf6'
  accent-cyan: '#06b6d4'
  text-white: '#f8f9fa'
  text-dim: 'rgba(255,255,255,0.60)'
  text-ghost: 'rgba(255,255,255,0.30)'
  text-phantom: 'rgba(255,255,255,0.10)'
  border-strong: 'rgba(255,255,255,0.15)'
  border-soft: 'rgba(255,255,255,0.10)'
  border-subtle: 'rgba(255,255,255,0.05)'
  success: '#10b981'
  warning: '#f59e0b'
  error: '#ef4444'
typography:
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '13px'
    lineHeight: '1.6'
    note: 'Global default — applied at layout root via font-mono'
  sans-label:
    fontFamily: 'Inter, ui-sans-serif, sans-serif'
    fontSize: '10px–11px'
    textTransform: uppercase
    letterSpacing: '0.2em'
    fontWeight: '700'
    note: 'Reserved for badge text and system metadata only'
  billboard:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: 'clamp(text-[5vw], text-[8vw], 100px)'
    fontWeight: '700'
    letterSpacing: 'tighter'
    lineHeight: '0.9'
    note: 'Hero H1 only — billboard scale'
rounded:
  sm: '4px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  full: '9999px'
spacing:
  section-x: 'px-6 md:px-12 lg:px-20'
  section-x-inner: 'px-10 md:px-20'
  section-y-major: 'py-36'
  section-y-minor: 'py-16 md:py-24'
  section-bar: 'py-8'
components:
  ambient-blob:
    size: '500px–600px'
    blur: 'blur-[120px]'
    opacityViolet: '10%'
    opacityCyan: '8%'
    position: fixed
    animation: animate-blob
  spine:
    width: '1px'
    color: 'rgba(255,255,255,0.10)'
    position: fixed
    zIndex: z-0
    leftPosition: 'left-6 md:left-12 lg:left-20'
    rightPosition: 'right-6 md:right-12 lg:right-20'
  diamond-node:
    size: '6px–8px'
    border: '1px solid rgba(255,255,255,0.30)'
    background: '{colors.bg-background}'
    transform: 'rotate-45'
  feature-card:
    background: 'rgba(255,255,255,0.03)'
    borderTop: '2px solid accent-color'
    borderOther: '1px solid rgba(255,255,255,0.05)'
    borderRadius: '{rounded.md}'
    hoverBackground: 'rgba(255,255,255,0.05)'
    padding: '32px'
  button-terminal:
    background: 'rgba(255,255,255,0.05)'
    backgroundHover: 'rgba(255,255,255,0.10)'
    border: '1px solid rgba(255,255,255,0.10)'
    textColor: '{colors.text-white}'
    prefix: '>'
    prefixColor: '{colors.accent-violet}'
    prefixOpacity: '60% default → 100% on hover'
  button-solid:
    background: '#ffffff'
    textColor: '#000000'
    note: 'High-contrast secondary CTA'
  button-variable:
    background: transparent
    textColor: '{colors.text-dim}'
    textColorHover: '{colors.text-white}'
    note: 'Ghost style — nav links, sign in'
  product-mockup-panel:
    background: 'rgba(255,255,255,0.02)'
    border: '1px solid rgba(255,255,255,0.08)'
    borderRadius: '{rounded.xl}'
    padding: '24px'
    font: 'font-mono text-[12px]'
    note: 'Flat panel for product previews. NO macOS dots here.'
---

## Overview

**Dark Minimalist with a subtle terminal signature.**

Cognilot is not a pure terminal emulator. The interface is a clean, near-black product that uses _specific_ terminal-inspired details as a differentiator — the `> cognilot_` logotype, `├──` tree footer, `//` comment subtext, git branch SVGs — applied with restraint, not as a blanket system.

The **marketing site (`/home`)** is the canonical reference implementation. Every new surface in the product must feel like it belongs to the same visual world.

---

## Core Aesthetic Principles

1. **Dark void foundation** — Root background is near-black `#050505`. Depth comes from the ambient blobs, not from layered gray panels.
2. **Vertical spines as structure** — Two fixed `1px` lines at the margins define the layout. Diamond nodes mark intersections. This is the most distinctive structural element.
3. **Monospace default** — `font-mono` at the layout root. Billboard for heroes, 13px for body. `font-sans` only for badge/system metadata.
4. **Terminal as signature, not system** — `>`, `//`, `$`, `├──`, ASCII art appear selectively (1–2 per section max). They create brand recognition, not an IDE simulation.
5. **Accent colors as punctuation** — Violet and cyan appear at `/`, `_`, `>`, active dots, and link states. Not on every heading.
6. **Flat over layered** — Feature cards use `bg-surface border-t-2 accent-color`. Never nest `bg-*` panels inside panels.

---

## Colors

| Token              | Value                    | Usage                                          |
| ------------------ | ------------------------ | ---------------------------------------------- |
| `bg-background`    | `#050505`                | Root background                                |
| `bg-surface`       | `rgba(255,255,255,0.03)` | Feature cards, subtle fills                    |
| `bg-surface-hover` | `rgba(255,255,255,0.05)` | Hover states on cards/rows                     |
| `bg-blob-violet`   | `rgba(139,92,246,0.10)`  | Left ambient blob                              |
| `bg-blob-cyan`     | `rgba(6,182,212,0.08)`   | Right ambient blob                             |
| `accent-violet`    | `#8b5cf6`                | Logo `>`, heading `/`, active accents          |
| `accent-cyan`      | `#06b6d4`                | Cursor `_`, heading `//`, links, active states |
| `text-white`       | `#f8f9fa`                | Active, important text                         |
| `text-dim`         | `rgba(255,255,255,0.60)` | Secondary body text, descriptions              |
| `text-ghost`       | `rgba(255,255,255,0.30)` | Metadata, decorative labels, spines            |
| `text-phantom`     | `rgba(255,255,255,0.10)` | Placeholders, extreme de-emphasis              |
| `border-strong`    | `rgba(255,255,255,0.15)` | Nav bottom border                              |
| `border-soft`      | `rgba(255,255,255,0.10)` | Spines, general borders                        |
| `border-subtle`    | `rgba(255,255,255,0.05)` | Internal dividers, section `border-y`          |

### Do not use

- Hardcoded hex values (except `#050505`)
- `bg-gray-*`, `bg-zinc-*`, `text-blue-500` or similar non-token utilities
- Solid white/light backgrounds as fills
- More than 2 ambient blobs

---

## Typography

### Scale

| Level               | Classes                                                                                      | Context                                   |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Billboard H1**    | `font-mono font-bold leading-[0.9] tracking-tighter text-[8vw] sm:text-[6vw] md:text-[5vw]`  | Hero headline                             |
| **Section H2**      | `font-mono font-bold leading-none tracking-tighter text-[5vw] sm:text-[4vw] md:text-[3.5vw]` | Content section headings                  |
| **Body**            | `font-mono text-[13px] leading-relaxed`                                                      | Default readable content                  |
| **Small/meta**      | `font-mono text-[11px] uppercase tracking-widest`                                            | Coverage bars, labels                     |
| **Comment subtext** | `font-mono text-[13px] text-dim italic`                                                      | `/** block comment */` style descriptions |
| **Badge**           | `font-sans text-[10px] uppercase tracking-widest font-bold`                                  | System tags only                          |

### Section heading pattern

```
SECTION_NAME/ /
                ↑          ↑
         text-accent-violet  text-accent-cyan
```

---

## Layout Components

### Vertical Spine System

Two fixed `1px` lines at the margin positions, always present via `MarketingLayout`.

```
left-6 md:left-12 lg:left-20    right-6 md:right-12 lg:right-20
       │                                       │
       │   ◇  ←── Diamond node at border       │
       │                                       │
```

### Section structure

```
<section px-6 md:px-12 lg:px-20 py-36>
  <div px-10 md:px-20>   ← clears spine area
    content
  </div>
</section>
```

### Ambient Background

```
Fixed behind all content:
  ◉ Violet blob: top-left, 600px, blur-[120px], opacity 10%
  ◉ Cyan blob: bottom-right, 500px, blur-[120px], opacity 8%
```

---

## Interactive Components

### Feature Cards

```tsx
<div className="p-8 bg-surface border-t-2 border-accent-cyan border-x border-b border-white/5 rounded transition-all hover:bg-white/5 duration-300">
  <div className="mb-6 text-accent-violet">{icon}</div>
  <h3 className="font-mono text-white font-bold text-base mb-4">{title}</h3>
  <p className="font-mono text-dim text-[13px] leading-relaxed">{desc}</p>
</div>
```

Top border accent options: `border-accent-cyan` / `border-accent-violet` / `border-success`

### Accordion (Animated with CSS grid trick)

```tsx
// Collapsed → Expanded: no JS height measurement
<div
  className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
>
  <div className="overflow-hidden">{/* content */}</div>
</div>
```

### Product Mockup Panel (flat, no macOS dots)

```tsx
<div className="border border-white/8 bg-white/[0.02] rounded-xl p-6 font-mono text-[12px] leading-relaxed">
  <div className="text-ghost mb-3 text-[11px] uppercase tracking-widest">// preview</div>
  <pre className="text-dim whitespace-pre-wrap">{mockupContent}</pre>
</div>
```

---

## Terminal Signature Catalog

Use these elements selectively (max 1–2 per section):

| Element         | Where used                      | Code pattern                                                               |
| --------------- | ------------------------------- | -------------------------------------------------------------------------- |
| Logotype        | Nav, anywhere the brand appears | `> cognilot_` with violet `>` and cyan `_`                                 |
| Status dot      | Hero release badge              | `w-2 h-2 rounded-full bg-accent-violet animate-pulse shadow-[0_0_8px_...]` |
| Comment subtext | Hero description                | `` `/**\n * description\n */` `` italic dim                                |
| Coverage bar    | Stats section                   | `font-mono text-[11px] uppercase text-ghost` + pipe separators             |
| Git branch SVG  | Hero, features sections         | Violet/cyan path + circle nodes, opacity 30%                               |
| Footer tree     | Footer only                     | `├──`, `└──`, `~/path $ tree` pattern                                      |
| ASCII art       | Footer only                     | Monospace art, desktop only, `text-[10px]`                                 |

---

## Animations

| Class                             | Use                                                    |
| --------------------------------- | ------------------------------------------------------ |
| `animate-fade-in`                 | Page-level entry (`<div className="animate-fade-in">`) |
| `animate-blob`                    | Ambient background blobs                               |
| `animate-pulse`                   | Status dots, loading indicators                        |
| `transition-colors`               | Button, link, card hover states                        |
| `transition-opacity`              | Preview fades, button prefix reveal                    |
| `transition-[grid-template-rows]` | Accordion expand/collapse                              |
| `duration-300`                    | Standard — use on all transitions                      |

---

## Do's and Don'ts

### ✅ Do

- Let **spines + whitespace + typography** create structure
- Use accent colors as **punctuation** at `>`, `_`, `/`, `//` positions
- Use `text-dim` for body, `text-ghost` for meta, `text-white` for active
- Use the `border-t-2 accent-color` pattern for feature differentiation
- Use the CSS grid trick for smooth accordion animations
- Wrap client-side interactive sections with `next/dynamic` to preserve Server Components

### ❌ Don't

- Use macOS window dots outside of explicit product mockup contexts
- Add more than 2 ambient blobs
- Use `font-sans` for body or data text
- Put `text-accent-violet` on every heading — it loses meaning
- Nest `bg-*` panels inside other `bg-*` panels
- Add `backdrop-blur` to anything other than the nav
- Create generic SaaS patterns: icon grids, filled gradient sections, floating label inputs
