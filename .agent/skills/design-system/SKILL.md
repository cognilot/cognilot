---
name: Cognilot Terminal Design System
description: Comprehensive guidelines and strict rules for creating new React components and pages using the Cognilot Text-based / IDE / Terminal aesthetic.
---

# Cognilot Terminal Design System (Terminal/IDE Aesthetic)

This skill must be invoked whenever you are instructed to create a new page, component, or modify existing UI elements within the Cognilot web application. The application strictly follows a "Developer-centric, IDE, and Console/Terminal" design language. **Generic modern web features (e.g., standard shadcn/ui cards with thick borders, bright white backgrounds, generic rounded buttons, or glassmorphism without purpose) are strictly forbidden.**

## 1. Core Principles

- **Text is UI**: The interface relies heavily on typography rather than boxes and shapes.
- **Monospace First**: The default font family for the application is monospace (`font-mono`).
- **Dark Mode Only**: The application operates in a deep dark environment. The root background is a flat `#050505`. Floating elements use transparent dark backgrounds (`bg-bg-primary/90`) with aggressive background blur (`backdrop-blur-2xl`).
- **Syntactic Sugar**: Use code syntax as visual embellishments instead of standard icons or dividers.
  - Headings: `# Title`, `## Subtitle`
  - Hints and Descriptions: `// This is a hint`
  - CLI Executables (Primary Actions): `./submit.sh`, `./save.sh`
  - Array/List Indicators: `[ ]`, `> _`

## 2. Typography & Colors

### Typography

- **Primary Font**: `font-mono`. Use `text-[13px]` for standard body text.
- **Secondary Font (Labels/Microcopy)**: `font-sans`. Use very small sizes (`text-[10px]` or `text-[11px]`), `uppercase`, `tracking-widest`, and `font-bold` for system labels, badges, or window titles.

### Colors

Always use the predefined Tailwind CSS variables. Avoid hard-coded hex colors except for `#050505` for the absolute background.

- **Text Primary**: `text-white` (for active/important text).
- **Text Muted**: `text-white/60`, `text-white/50`, `text-white/30`, `text-white/20`, and `text-white/10` (for progressive dimming of metadata, labels, and placeholders).
- **Accents**:
  - `text-accent-cyan` (for active states, values, brackets, and primary highlights).
  - `text-accent-violet` (for Markdown syntax like `#`, system labels, and secondary actions).
- **Utility / Status**:
  - Success/Done: `text-green-400` or `text-green-500`
  - Error/Required: `text-red-400`
  - Warning: `text-yellow-500`

## 3. Structural Components

### Window / Terminal Containers

Whenever creating a "Card" or a distinct visual block, style it to resemble an IDE window, a Terminal session, or a Markdown file.

```tsx
<div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative animate-scale-in">
  {/* macOS Window Controls Mock (Optional for top-level pages) */}
  <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2 select-none">
    <div className="flex gap-2 mr-4">
      <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
      <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
    </div>
    {/* File Name Header */}
    <div className="text-white/30 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 font-sans font-bold flex-1 justify-end">
      FILENAME.MD
    </div>
  </div>

  {/* Content */}
  <div className="p-6 md:p-8 font-mono text-[13px]">{children}</div>
</div>
```

### Headings (Markdown Style)

Always structure page content like a markdown document.

```tsx
<div className="mb-8">
  <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
    <span className="text-accent-violet">#</span> Header Title
  </h1>
  <div className="text-white/40 text-[12px] uppercase tracking-wider font-bold">
    <span className="text-accent-cyan">##</span> Subtitle / ID
  </div>
</div>
```

### Descriptions and Hints (Comment Style)

```tsx
<div className="text-white/10 tracking-wider font-bold select-none">
  <span className="">//</span>
  <span className="ml-2 font-sans italic">Hint description text</span>
</div>
```

## 4. Interactive Elements

### Buttons

**DO NOT use standard filled buttons (unless absolutely necessary like Google Auth).** Primary form actions should simulate executing a shell script. Secondary actions should look like command line flags or brackets.

**Primary Action (`.sh` executable):**

```tsx
<button className="py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors flex items-center gap-2 border border-white/10 group">
  <span className="text-accent-violet font-bold opacity-50 group-hover:opacity-100 transition-opacity">
    {'>'}
  </span>
  ./execute_action.sh
</button>
```

**Tertiary / Add Action (Bracket style):**

```tsx
<button className="text-accent-cyan/80 hover:text-accent-cyan disabled:opacity-20 font-bold transition-colors">
  [ADD]
</button>
```

### Form Inputs

Avoid solid border boxes. Use raw, bottom-bordered (`border-b`) transparent inputs that look like a terminal prompt.

```tsx
<div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1 group">
  {/* Label */}
  <div className="text-accent-violet select-none w-[160px] md:w-[200px] shrink-0 py-1.5 flex items-center font-semibold">
    field_name
    <span className="text-accent-violet/50 ml-1">:</span>
  </div>

  {/* Input */}
  <input
    type="text"
    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
    placeholder="Enter value..."
  />
</div>
```

### Lists and Sidebar Navigation

Navigation elements should look like an IDE file explorer tree.

- Identify inactive states with `text-white/50 hover:text-white/80`.
- Identify active states with `text-white bg-white/10` and `text-accent-cyan` for the text.
- Use carrots `>` to indicate selection or expansion.

## 5. Animation and Layout

- All root application layouts sit behind an animated background using `animate-blob` and `mix-blend-screen` with `blur-[120px]` elements. (Do not recreate this per page, assume `MainLayout` handles it).
- Use `animate-fade-in` and `animate-scale-in` for new elements mounting to the DOM to provide a subtle, non-disruptive appearance.
- Transitions on interactive states (hover/focus) should use standard Tailwind `transition-all duration-200` or `transition-colors`.

## 6. Execution Protocol

Whenever you generate code referencing this skill:

1. Wrap the specific logic or element strictly according to these layout definitions.
2. Read the surrounding layout structure first (`MainLayout`, `Sidebar`, etc.) to ensure seamless embedding.
3. Review variable names and text copy to match the "Developer-centric" persona (e.g., using `snake_case` or `lowercase` for fake code syntax).
