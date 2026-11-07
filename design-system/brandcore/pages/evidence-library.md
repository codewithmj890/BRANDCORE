# Page Guidelines: Evidence Library

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Evidence Library
> **Route:** `/evidence` (mapped to `activePage === 'evidence'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Search/filter toolbar above a full-width data table
- **Sidebar:** Expanded by default; active item = `evidence`
- **Table:** Full width, horizontal scroll on mobile
- **Filter row:** Search input + source type filter dropdown

### Color Usage
- **Source type badges:** Muted background with `--color-muted-foreground` text
- **Status badges:** Active = green, others = amber/red
- **Linked/unlinked indicators:** Green for linked, gray for unlinked
- **Source URL:** Monospace font, `--color-muted-foreground`, truncate with ellipsis

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`
- **Evidence title:** Plus Jakarta Sans, 500, 0.9375rem (15px), `--color-foreground`
- **Source type label:** Plus Jakarta Sans, 400, 0.75rem (12px), `--color-secondary`
- **Table headers:** Plus Jakarta Sans, 500, 0.75rem (12px), `--color-secondary`, uppercase, tracking-wider
- **Date metadata:** Plus Jakarta Sans, 400, 0.8125rem (13px), `--color-muted-foreground`

### Components
- **Data table:** Full-width, border `--color-border`, row hover `--color-muted`
- **Source type badge:** Small, pill-shaped, muted background
- **Empty state:** Centered illustration + title + description
- **Search input:** `--space-md` padding, border `--color-border`, focus ring `--color-ring`

### Responsive Behavior
- **Mobile:** Table scrolls horizontally, filter row stacks vertically
- **Tablet:** Table full width, filter row inline
- **Desktop:** Table full width with all columns visible

### Interactions
- **Row click:** Navigates to evidence detail (visual only — no detail route implemented)
- **Search:** Debounced, filters client-side
- **Source type filter:** Immediate client-side filter

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Layout | N/A | Toolbar + full-width table |
| Source type badge | N/A | Muted pill badge |
