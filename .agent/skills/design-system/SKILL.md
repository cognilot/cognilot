---
name: Cognilot Terminal Design System
description: Comprehensive guidelines and strict rules for creating new React components and pages using the Cognilot Text-based / IDE / Terminal aesthetic.
---

# Cognilot Terminal Design System

> **Canonical Reference:** The **Memory view** (`/dashboard/memory`) is the gold standard. Every new page must look like it belongs in the same application. Before writing any UI, visualize how it would render next to the Memory view.

This skill must be invoked whenever you create a new page, component, or modify existing UI elements within the Cognilot web application. The application strictly follows a **"Developer-centric, IDE, and Console/Terminal"** design language.

**Strictly forbidden:**

- Standard shadcn/ui cards with thick borders
- Any solid non-black backgrounds
- Generic rounded buttons with filled colors
- Labels floating above inputs (use the KV-row pattern instead)
- Glassmorphism without a dark base
- Nested multiple `bg-*` containers inside a window

---

## 1. Core Principles

- **Text is UI**: The interface relies on typography rather than shapes. Whitespace and text rhythm create visual structure.
- **Monospace First**: `font-mono` is the default font family for the entire application.
- **Dark Mode Only**: Root background is flat `#050505`. Floating elements use `bg-bg-primary/90` + `backdrop-blur-2xl`.
- **One Window Per Section**: Each distinct content block is wrapped in exactly one window container. Never nest dark panels.
- **Syntactic Sugar**: Use code syntax as visual embellishments — not icons or decorative shapes.
  - Page headings: `# title.md`
  - Section labels: `## section_id`
  - Comments/hints: `// this is a hint`
  - Primary actions: `./save.sh`, `./submit.sh`
  - Secondary actions: `[RELOAD]`, `[ADD]`, `[ACTIVE]`
  - Field separator: `field_name: value`
  - Prompt prefix: `> _`, `$ command`

---

## 2. Typography & Colors

### Font Roles

| Role               | Classes                                                     | Use                                              |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------ |
| **Mono (default)** | `font-mono text-[13px]`                                     | All data, inputs, values, body text              |
| **Sans label**     | `font-sans text-[10px] uppercase tracking-widest font-bold` | Window titles, badges, `## section` headers only |

### Color Reference

Always use predefined Tailwind variables. Avoid hard-coded hex (except `#050505` for the void background).

| Meaning             | Class                | Notes                                  |
| ------------------- | -------------------- | -------------------------------------- |
| Primary accent      | `text-accent-violet` | `#` headings, field labels, `>` prefix |
| Active/value accent | `text-accent-cyan`   | Values, active states, `[]` brackets   |
| Active text         | `text-white`         | Important/active data                  |
| Secondary text      | `text-white/60`      | Normal data                            |
| Ghost text          | `text-white/30`      | Section headers, metadata              |
| Phantom text        | `text-white/10`      | Placeholders, disabled hints           |
| Success             | `text-green-400`     | Enabled states, done indicators        |
| Error/danger        | `text-red-400`       | Destructive actions, required fields   |
| Warning             | `text-yellow-500`    | Alerts, rate-limit warnings            |

---

## 3. Window Container (The Only Allowed Card Pattern)

Every major content area **must** use this structure — no exceptions.

```tsx
<section className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
  {/* macOS Title Bar */}
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
  {/* Body */}
  <div className="p-6 md:p-8 font-mono text-[13px]">{/* content */}</div>
</section>
```

### Window Rules

- Use `bg-white/5` (not `bg-white/3` or `bg-white/[0.03]`) for the title bar background.
- macOS dots have glowing shadows — **always** include the `shadow-[...]` values.
- Filename in the title bar uses `tracking-[0.2em]`, not `tracking-widest`.

---

## 4. Page Header (Outside the Window)

Every route renders a header outside the main window, before the window container.

```tsx
<div className="mb-8">
  <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
    <span className="text-accent-violet">#</span> page_name.md
  </h1>
  <div className="text-white/40 flex items-center justify-between">
    <span>{'// Page description as a comment'}</span>
    <button className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5">
      <RefreshCw className="w-3.5 h-3.5" />
      [RELOAD]
    </button>
  </div>
</div>
```

---

## 5. Section Headers (Inside a Window)

```tsx
<div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px] font-sans">
  ## section_identifier
</div>
```

---

## 6. Key–Value Row (Primary Input & Display Pattern)

**This is the most important pattern in the design system.** All data fields — both editable inputs and read-only values — use this pattern. No floating labels, no border boxes around individual inputs.

```tsx
{
  /* Editable field */
}
<div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors group py-1">
  <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
    field_name<span className="text-accent-violet/50">:</span>
  </span>
  <input
    type="text"
    className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
    placeholder="value..."
  />
</div>;

{
  /* Read-only value */
}
<div className="flex relative items-start -mx-4 px-4 py-1">
  <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
    field_name<span className="text-accent-violet/50">:</span>
  </span>
  <span className="text-white py-1.5 flex-1">{value}</span>
</div>;
```

### KV Row Rules

- Label is always `text-accent-violet font-semibold` — never `text-white` or `text-white/40`.
- The colon `:` is a separate `span` with `text-accent-violet/50` opacity.
- Label fixed width: `w-[160px] md:w-[200px]` — consistent across the entire page.
- Hover state: `hover:bg-white/5 -mx-4 px-4` — the negative margin creates a full-bleed hover effect.
- Input: no border, `bg-transparent`, `outline-none`. The hover background of the row is the only focus affordance.

---

## 7. Buttons

### Primary Action (Shell Script)

```tsx
<button
  className="py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors
                   flex items-center gap-2 border border-white/10 group font-bold select-none"
>
  <span className="text-accent-violet opacity-50 group-hover:opacity-100 transition-opacity">
    {'>'}
  </span>
  ./action_name.sh
</button>
```

### Secondary / Bracket Action

```tsx
<button className="text-accent-cyan/80 hover:text-accent-cyan font-bold transition-colors">
  [ACTION]
</button>
```

### Destructive Action

```tsx
<button
  className="w-full py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10
                   text-red-400 rounded text-[11px] font-bold transition-colors"
>
  EXECUTE CLEAR_MEMORY
</button>
```

### Toggle Badge Button

```tsx
<button
  className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer ${
    isActive
      ? 'bg-cyan-500/10 border border-cyan-500/20 text-accent-cyan hover:bg-cyan-500/20'
      : 'bg-white/5 border border-white/10 text-white/30 hover:bg-white/10'
  }`}
>
  {isActive ? '[ACTIVE]' : '[INACTIVE]'}
</button>
```

---

## 8. Lists / Data Tables

List items follow the KV row hover pattern without the label/value split.

```tsx
<div className="border border-white/5 rounded-lg overflow-hidden divide-y divide-white/5 bg-white/[0.01]">
  {items.map((item) => (
    <div className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-white/20 select-none text-[12px] shrink-0">{'>'}</span>
        <span className="text-accent-violet font-semibold">{item.key}</span>
        <span className="text-white/30 select-none">=</span>
        <span className="text-accent-cyan font-mono truncate">"{item.value}"</span>
      </div>
      {/* Actions: opacity-0 group-hover:opacity-100 */}
    </div>
  ))}
</div>
```

---

## 9. Status Badges

```tsx
{
  /* Category/tag badge */
}
<span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/40 uppercase tracking-wide font-sans">
  category
</span>;

{
  /* Active state badge */
}
<span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-accent-cyan font-bold font-sans">
  [ACTIVE]
</span>;

{
  /* Pro/plan badge */
}
<span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-accent-violet font-bold font-sans">
  PRO
</span>;
```

---

## 10. Empty State

```tsx
<div className="text-white/20 select-none py-8 border border-dashed border-white/5 rounded-lg text-center font-mono">
  // No entries found. Use the form above to add one.
</div>
```

---

## 11. Loading State

```tsx
<div className="p-8 max-w-4xl mx-auto font-mono text-[13px] text-white/30 space-y-6 animate-pulse">
  <div>// reading_data.sh...</div>
  <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
</div>
```

---

## 12. Footer / Info Bar (Inside Window)

```tsx
<div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[11px] text-white/20 font-mono">
  <div>// Total loaded: {count} entries</div>
  <div>// scope: context_name</div>
</div>
```

---

## 13. Animation Rules

| Token               | Use                                           |
| ------------------- | --------------------------------------------- |
| `animate-fade-in`   | Applied to the page root `div` on every route |
| `animate-scale-in`  | Applied to window containers on mount         |
| `transition-colors` | All hover/focus state changes (buttons, rows) |
| `animate-pulse`     | Loading skeleton states                       |
| `animate-spin`      | Saving spinner overlays                       |

---

## 14. Layout Structure

```
Page Root (p-8 max-w-4xl mx-auto animate-fade-in font-mono text-[13px])
  ├── Page Header (mb-8)
  │     ├── h1: # page_name.md
  │     └── comment + [RELOAD]
  └── Main Content Grid
        └── Window Container(s) (bg-bg-primary/90 rounded-xl border ...)
              ├── Title Bar
              └── Body (p-6 md:p-8)
                    ├── ## section_header
                    ├── KV Rows / List Items
                    └── Action Buttons
```

---

## 15. Execution Protocol

When generating code:

1. Start with the page root structure — `animate-fade-in`, `font-mono`, `text-[13px]`.
2. Render the page header outside any window container.
3. Wrap content in exactly **one** window container per logical section.
4. Use KV rows for **all** form inputs — zero exceptions.
5. Use `.sh` buttons for all primary save/submit actions.
6. Verify labels are `snake_case` and `text-accent-violet`.
7. Verify the filename in the title bar reflects the route (e.g., `ALIASES.ENV`, `SETTINGS.SH`).
