---
name: Cognilot Terminal Design System
description: Comprehensive guidelines for creating UI in Cognilot. Identity = Dark Minimalist with a subtle terminal signature. The marketing site is the canonical reference and global standard for all surfaces.
---

# Cognilot Design System

> **Canonical Reference:** The **Home marketing page** (`/home`) and **MarketingFooter** are the gold standard. Every new page, section, and component must feel like it belongs in the same product.

---

## 1. Core Identity

**Dark Minimalist with a subtle terminal signature.**

Cognilot is not a pure IDE/terminal emulator. The interface is a clean, near-black minimal product that uses _specific_ terminal-inspired details as a differentiator — not as the entire design language.

### What this means

- **Structure is created with whitespace and typography**, not with boxes, cards, or filled backgrounds.
- **Terminal elements appear as a signature**: the `> cognilot_` logotype, `//` comments in copy, `├──` tree structures in the footer, `$` prompt references, ASCII art. These are curated details, not a blanket rule.
- **Monospace is the default font**, but it's used in a clean, modern way — not to simulate a terminal output stream.
- **Accent colors (violet + cyan) are used sparingly** — for logotype punctuation, active states, links, and key interactive elements. Not on every heading.

### Strictly forbidden

- Solid bright backgrounds (white, gray-100, etc.) as section fills
- Icon grids or feature cards with thick borders and header icons
- Generic SaaS gradient hero sections
- Nested `bg-*` panels inside panels
- Overusing `text-accent-violet` — it's a punctuation tool, not a heading color
- Adding macOS window dots to every component — reserve for product mockup previews only

---

## 2. Background & Layout System

### Root Background

```tsx
// In MarketingLayout
<main className="min-h-screen bg-background text-foreground overflow-hidden relative font-mono">
```

- Root: `bg-background` → maps to `#050505` (near-black void)
- `font-mono` applied globally at the layout root

### Ambient Blobs (Fixed, Decorative)

Two large blurred radial lights sit fixed behind all content, providing depth without visual noise.

```tsx
<div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none select-none">
  <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[120px] animate-blob" />
  <div
    className="absolute -bottom-32 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px] animate-blob"
    style={{ animationDelay: '3s' }}
  />
</div>
```

**Rules:**

- Max opacity: `/10` for violet, `/8` for cyan
- Always `blur-[120px]` or higher — never sharp
- Always `fixed`, `pointer-events-none`, `aria-hidden`
- Only two blobs — never add more

### Vertical Spines (The Primary Structural Element)

The most distinctive structural element of the layout. Two fixed vertical lines define the content margins.

```tsx
// In MarketingLayout — always present
<div className="fixed inset-y-0 left-6 md:left-12 lg:left-20 w-px bg-white/10 pointer-events-none select-none z-0" aria-hidden="true" />
<div className="fixed inset-y-0 right-6 md:right-12 lg:right-20 w-px bg-white/10 pointer-events-none select-none z-0" aria-hidden="true" />
```

### Diamond Nodes

Where content intersects the spine (section borders, nav bottom), add a rotated square node.

```tsx
// At a border intersection
<div className="absolute left-6 md:left-12 lg:left-20 -bottom-[4.5px] w-2 h-2 bg-background border border-white/30 rotate-45 z-30 -translate-x-1/2" />
<div className="absolute right-6 md:right-12 lg:right-20 -bottom-[4.5px] w-2 h-2 bg-background border border-white/30 rotate-45 z-30 translate-x-1/2" />
```

Also used inside sections as decorative cross-margin accents:

```tsx
<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-background border border-white/30 rotate-45" />
```

### Section Padding Convention

All sections use consistent horizontal padding aligned to the spines, and vertical padding for breathing room:

```tsx
<section className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-36">
  {/* Inner content pad: compensates for spine width */}
  <div className="relative px-10 md:px-20">{/* content */}</div>
</section>
```

- Outer: `px-6 md:px-12 lg:px-20` — aligns with spine positions
- Inner: `px-10 md:px-20` — clears the spine area
- Vertical: `py-36` for major sections, `py-16 md:py-24` for secondary pages

### Flat Section Dividers

Use `border-y border-border-subtle` for sections that need a horizontal boundary:

```tsx
<section className="relative z-10 border-y border-border-subtle py-8 px-6 md:px-12 lg:px-20 w-full">
```

---

## 3. Typography

### Font Roles

| Role               | Classes                                                     | Use                                                      |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------------------- |
| **Mono (default)** | `font-mono`                                                 | Entire app default. Body text, labels, code, nav, footer |
| **Sans label**     | `font-sans text-[10px] uppercase tracking-widest font-bold` | Badge text, system metadata only                         |

### Scale

| Context             | Classes                                                                                      | Use                                  |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Billboard hero**  | `font-mono font-bold leading-[0.9] tracking-tighter text-[8vw] sm:text-[6vw] md:text-[5vw]`  | Primary H1 on hero sections          |
| **Section heading** | `font-mono font-bold leading-none tracking-tighter text-[5vw] sm:text-[4vw] md:text-[3.5vw]` | H2 inside content sections           |
| **Body text**       | `font-mono text-[13px] leading-relaxed`                                                      | Default readable text                |
| **Small / meta**    | `font-mono text-[11px] uppercase tracking-widest`                                            | Labels, badges, coverage bars        |
| **Comment style**   | `font-mono text-[13px] text-dim italic`                                                      | Subtext rendered as `/** comment */` |

### Section heading pattern (with accent punctuation)

```tsx
<h2 className="font-mono font-bold leading-none tracking-tighter text-white mb-20 text-[5vw] sm:text-[4vw] md:text-[3.5vw]">
  SECTION_NAME
  <span className="text-accent-violet">/</span>
  <span className="text-accent-cyan">/</span>
</h2>
```

### Terminal comment subtext

```tsx
<div className="font-mono text-[13px] leading-relaxed text-dim italic whitespace-pre-wrap">
  {`/**\n * Cognilot learns your data and fills forms with AI precision.\n */`}
</div>
```

---

## 4. Colors

Always use predefined Tailwind tokens — no hardcoded hex values (except `#050505` for the void if needed).

| Token                  | Value                    | Use                                                |
| ---------------------- | ------------------------ | -------------------------------------------------- |
| `text-white`           | `#f8f9fa`                | Active, important text                             |
| `text-dim`             | `rgba(255,255,255,0.60)` | Secondary body text                                |
| `text-ghost`           | `rgba(255,255,255,0.30)` | Metadata, hints, decorative labels                 |
| `text-accent-violet`   | `#8b5cf6`                | Logo `>` prefix, `/` in headings, active accent    |
| `text-accent-cyan`     | `#06b6d4`                | `_` cursor, `//` in headings, links, active states |
| `bg-background`        | `#050505`                | Root background                                    |
| `bg-surface`           | `rgba(255,255,255,0.03)` | Subtle section fills, feature cards                |
| `border-white/5`       | —                        | Internal dividers                                  |
| `border-white/10`      | —                        | Spine lines, nav borders                           |
| `border-white/30`      | —                        | Diamond nodes, visible accents                     |
| `border-border-subtle` | —                        | Flat section `border-y` dividers                   |
| `border-border-strong` | —                        | Nav bottom border                                  |

---

## 5. Navigation

```tsx
<div className="relative z-20 w-full border-b border-border-strong bg-background/50 backdrop-blur-md">
  <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-6 w-full relative">
    {/* Logo */}
    <Link
      href="/home"
      className="font-mono text-white font-bold text-lg hover:opacity-80 transition-opacity"
    >
      <span className="text-accent-violet">&gt;</span> <span>cognilot</span>
      <span className="text-accent-cyan">_</span>
    </Link>

    {/* Actions */}
    <div className="flex items-center gap-6">
      <Button variant="variable" asChild>
        <Link href="/auth">sign_in</Link>
      </Button>
      <Button variant="solid" asChild>
        <Link href="/auth?mode=signup">Get Started</Link>
      </Button>
    </div>

    {/* Diamond nodes on spine intersection */}
    <div className="absolute left-6 md:left-12 lg:left-20 -bottom-[4.5px] w-2 h-2 bg-background border border-white/30 rotate-45 z-30 -translate-x-1/2" />
    <div className="absolute right-6 md:right-12 lg:right-20 -bottom-[4.5px] w-2 h-2 bg-background border border-white/30 rotate-45 z-30 translate-x-1/2" />
  </nav>
</div>
```

---

## 6. Buttons

Three variants in use — use the right one by context:

### `variant="terminal"` — Primary action (CTA)

Shell script style. Used for signup / main conversion actions.

```tsx
<Button variant="terminal" size="lg" asChild>
  <Link href="/auth?mode=signup">
    <span className="text-accent-violet opacity-60 group-hover:opacity-100 transition-opacity font-bold">
      &gt;
    </span>
    ./get_started.sh
  </Link>
</Button>
```

### `variant="solid"` — Solid white button

High contrast. Used for secondary CTA alongside the terminal button.

```tsx
<Button variant="solid" asChild>
  <Link href="/auth?mode=signup">Get Started</Link>
</Button>
```

### `variant="variable"` — Ghost / text action

Low-prominence. Used for sign-in, nav links.

```tsx
<Button variant="variable" asChild>
  <Link href="/auth">sign_in</Link>
</Button>
```

---

## 7. Feature Cards (Flat style)

Used in grid sections like `CORE_CAPABILITIES`. No macOS dots, no window containers — flat card with a colored top border as the only accent.

```tsx
<div className="p-8 bg-surface border-t-2 border-accent-cyan border-x border-b border-white/5 rounded transition-all hover:bg-white/5 duration-300 group">
  <div className="mb-6 text-accent-violet">{icon}</div>
  <h3 className="font-mono text-white font-bold text-base mb-4">{title}</h3>
  <p className="font-mono text-dim text-[13px] leading-relaxed">{desc}</p>
</div>
```

**Variants for `border-t-2`:**

- `border-accent-cyan` — default feature
- `border-accent-violet` — secondary feature
- `border-success` (green) — third feature / privacy/security themes

---

## 8. Terminal Signature Elements

These are the curated terminal details that make Cognilot feel distinctive. Use them in the right contexts — do not spray them everywhere.

### Logotype

```tsx
<span className="text-accent-violet">&gt;</span> cognilot<span className="text-accent-cyan">_</span>
```

### Release / status badge

```tsx
<div className="inline-flex items-center gap-2 text-ghost text-xs font-mono mb-12 select-none">
  <span className="w-2 h-2 rounded-full bg-accent-violet animate-pulse shadow-[0_0_8px_var(--color-accent-violet)]" />
  <span>Beta abierta v0.6.5</span>
</div>
```

### Comment-style subtext

```tsx
<div className="font-mono text-[13px] text-dim italic">
  {`/**\n * Description as a block comment.\n */`}
</div>
```

### Coverage / metadata bar

```tsx
<div className="font-mono text-[11px] uppercase tracking-widest text-ghost">coverage</div>
<div className="flex gap-8 font-mono text-[12px] text-dim">
  <span>12+ field types</span>
  <span className="text-white/10">|</span>
  <span>30+ form patterns</span>
</div>
```

### Footer tree structure

```tsx
~/cognilot/footer <span className="text-accent-violet">$</span> <span className="text-ghost">tree</span>

├── privacy.md
├── terms.md
└── contact.md
```

### Git graph / circuit SVG (decorative)

Used in the hero and features sections — a subtle SVG overlaid near the right spine showing git-like branch paths.

```tsx
<div
  className="absolute inset-y-0 right-6 md:right-12 lg:right-20 w-32 pointer-events-none select-none opacity-30"
  aria-hidden="true"
>
  <svg className="w-full h-full overflow-visible">
    <path
      d="M 128,96 L 108,116 L 108,320 L 128,340"
      fill="none"
      stroke="var(--color-accent-violet)"
      strokeWidth="1.5"
    />
    <circle
      cx="108"
      cy="180"
      r="3"
      className="fill-background stroke-accent-violet"
      strokeWidth="1.5"
    />
    <circle cx="128" cy="96" r="3.5" className="fill-accent-violet" />
  </svg>
</div>
```

---

## 9. Product Mockup Preview (Optional Pattern)

When showing a product feature preview (e.g., in a feature accordion), use a **flat dark panel** — not a full window container with macOS dots.

```tsx
<div className="border border-white/8 bg-white/[0.02] rounded-xl p-6 font-mono text-[12px] leading-relaxed">
  <div className="text-ghost mb-3 text-[11px] uppercase tracking-widest">// preview</div>
  <pre className="text-dim whitespace-pre-wrap">
    {`// scanning form fields...\n> detected: 7 fields\n\nprofile.name  = "Jack Pérez"\nprofile.email = "jack@domain.com"`}
  </pre>
</div>
```

**When to use macOS window dots (rare):** Only when explicitly simulating a desktop app window inside a preview for marketing purposes. Never as a general card pattern.

---

## 10. Animations

| Token                | Use                                                        |
| -------------------- | ---------------------------------------------------------- |
| `animate-fade-in`    | Page-level entry for all routes                            |
| `animate-blob`       | Ambient background blobs (slow, large)                     |
| `animate-pulse`      | Pulsing dot on status badge / loading states               |
| `transition-colors`  | All hover/focus state changes on buttons, links, rows      |
| `transition-opacity` | Fade between states (prefix `>` on buttons, preview swaps) |
| `duration-300`       | Standard transition duration                               |

**CSS grid trick for accordion animation (no JS height measurement):**

```css
/* Collapsed */
grid-rows-[0fr] overflow-hidden transition-[grid-template-rows] duration-300

/* Expanded */
grid-rows-[1fr]
```

---

## 11. Execution Protocol

When generating a new page or section:

1. Place it inside the `MarketingLayout` — spines and blobs are inherited.
2. Use `px-6 md:px-12 lg:px-20 py-36` outer padding on the `<section>`.
3. Use `px-10 md:px-20` inner content container to clear the spine.
4. Use `font-mono` as default — never override with `font-sans` for body text.
5. Use `text-dim` for secondary text, `text-ghost` for decorative / meta text.
6. Use `text-accent-violet` and `text-accent-cyan` sparingly — punctuation and active states only.
7. Add diamond nodes only where content borders visually intersect the spines.
8. Use the terminal signature elements (comment subtext, `tree` footer, `$` prompt, etc.) as _flavor_ — maximum 1–2 per section.
9. For interactive client components: use `next/dynamic` to preserve the Server Component parent.
