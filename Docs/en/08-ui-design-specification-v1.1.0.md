# MATRIX Studio UI Design Specification v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Update | Removed redundant sections |
| 1.0.0 | 2025-12-28 | Initial | Complete UI design specification |

---

## Design Philosophy

**Cyberpunk Dark Theme** - Professional AI Video Generation Platform

**Keywords**: Dark | Tech | Precision | Professional | High Contrast | Electric Green

---

## Color System (OKLCH)

```css
/* Primary - Electric Green */
--primary: oklch(0.85 0.22 160);
--primary-foreground: oklch(0.12 0 0);

/* Base Colors */
--background: oklch(0.12 0 0);        /* Deep black */
--foreground: oklch(0.92 0 0);        /* Main text */
--card: oklch(0.16 0 0);              /* Card background */
--border: oklch(0.24 0 0);            /* Border */
--destructive: oklch(0.577 0.245 27.325); /* Danger red */

/* Sidebar */
--sidebar: oklch(0.1 0 0);            /* Darker background */
--sidebar-accent: oklch(0.18 0 0);    /* Hover state */
```

---

## Typography

### Font Families
```css
--font-sans: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

### Font Sizes
- `text-xs`: 12px (labels)
- `text-sm`: 14px (secondary text, buttons)
- `text-base`: 16px (body, default)
- `text-lg`: 18px (subheadings)
- `text-xl`: 20px (card titles)
- `text-2xl`: 24px (page titles)

### Font Weights
- `font-normal` (400): Body text
- `font-medium` (500): Subheadings, emphasis
- `font-semibold` (600): Headings, logo
- `font-bold` (700): Rarely used

---

## Spacing & Layout

### Spacing System (4px base)
```
gap-1: 4px    gap-2: 8px    gap-3: 12px   gap-4: 16px
gap-6: 24px   gap-8: 32px
```

### Border Radius
```css
--radius: 0.5rem;  /* 8px base */
rounded-sm: 4px    rounded-md: 6px    rounded-lg: 8px
rounded-xl: 12px
```

### Standard Layout
```
┌─────────────────────────────────┐
│  Header (h-14 / 56px)           │
├──────────┬──────────────────────┤
│ Sidebar  │  Main Content        │
│ (w-64)   │  (flex-1)            │
│ 256px    │                      │
└──────────┴──────────────────────┘
```

---

## Component Standards

### Tech Stack
- **Component Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion v12+

### Button
```tsx
variant="default"     // Primary (electric green)
variant="secondary"   // Secondary (gray)
variant="ghost"       // Transparent
variant="destructive" // Danger (red)

size="sm"      // h-8 px-3 text-xs
size="default" // h-10 px-4 py-2
size="lg"      // h-11 px-8
size="icon"    // h-10 w-10
```

### Card
```tsx
<Card className={cn(
  "cursor-pointer transition-colors",
  isSelected && "ring-2 ring-primary"
)}>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
</Card>
```

---

## Animation System

### Framer Motion Standard

```tsx
// Spring animation (recommended)
transition={{ type: "spring", damping: 25, stiffness: 300 }}

// Hover scale
<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>

// Fade in/out
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

// Slide panel
<motion.div
  initial={{ x: 300, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: 300, opacity: 0 }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
/>
```

---

## Icon System

**Library**: lucide-react

**Sizes**:
```tsx
h-3 w-3  // 12px - Small (list items)
h-4 w-4  // 16px - Standard (buttons, nav)
h-5 w-5  // 20px - Medium
h-6 w-6  // 24px - Large (play button)
```

---

## Accessibility (WCAG 2.1)

- **Contrast**: Body text 7:1 (AAA), Large text 4.5:1 (AA)
- **Focus indicator**: `@apply outline-ring/50;`
- **Keyboard navigation**: Tab / Enter / Escape / Arrows
- **Screen readers**: Semantic tags and `aria-label`

---

## Performance

1. **Images**: WebP format + placeholders
2. **Lazy loading**: Non-critical components use `React.lazy`
3. **Animation**: GPU acceleration (`transform` / `opacity`)
4. **Reduce reflows**: Avoid frequent layout property modifications

---

**中文版本**: `docs/08-ui-design-specification-v1.1.0.md`
