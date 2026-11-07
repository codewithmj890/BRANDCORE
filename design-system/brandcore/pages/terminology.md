# Page Guidelines: Terminology

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Terminology Management
> **Route:** `/terminology` (mapped to `activePage === 'terminology'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Term list with status (approved/prohibited/preferred) and category filters
- **Sidebar:** Expanded by default; active item = `terminology`
- **Table/List:** Full width, searchable and filterable

### Color Usage
- **Term status:** Approved = green, Prohibited = red, Preferred = blue
- **Category badges:** Muted background, `--color-muted-foreground` text
- **Replacement guidance:** Green text for preferred alternatives

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`
- **Term text:** Plus Jakarta Sans, 500, 0.9375rem (15px), `--color-foreground`
- **Replacement text:** Plus Jakarta Sans, 400, 0.875rem (14px), `--color-muted-foreground`
- **Table headers:** Plus Jakarta Sans, 500, 0.75rem (12px), `--color-secondary`, uppercase, tracking-wider

### Components
- **Term cards:** `--space-md` padding, border `--color-border`, hover subtle elevation
- **Status badge:** Small, pill-shaped, status-colored
- **Category badge:** Small, pill-shaped, muted background
- **Empty state:** Centered illustration + title + description

### Responsive Behavior
- **Mobile:** Single column, cards stack vertically
- **Tablet:** 2-column grid
- **Desktop:** 3-column grid or full-width table

### Interactions
- **Card click:** Navigates to term detail (visual only)
- **Search:** Debounced, filters client-side
- **Category filter:** Immediate client-side filter

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Layout | N/A | Term cards or table |
