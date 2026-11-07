# Page Guidelines: Brand Policies

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Brand Policies Management
> **Route:** `/policies` (mapped to `activePage === 'policies'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Policy list with status badges and version indicators
- **Sidebar:** Expanded by default; active item = `policies`
- **Table/List:** Full width, grouped by status or category

### Color Usage
- **Policy status:** Active = green, Draft = amber, Archived = gray
- **Version indicator:** Monospace, `--color-muted-foreground`
- **Effective dates:** `--color-muted-foreground`, smaller text

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`
- **Policy name:** Plus Jakarta Sans, 500, 0.9375rem (15px), `--color-foreground`
- **Policy description:** Plus Jakarta Sans, 400, 0.875rem (14px), `--color-muted-foreground`
- **Table headers:** Plus Jakarta Sans, 500, 0.75rem (12px), `--color-secondary`, uppercase, tracking-wider

### Components
- **Policy cards:** `--space-md` padding, border `--color-border`, hover subtle elevation
- **Status badge:** Small, pill-shaped, status-colored
- **Version badge:** Monospace, small, muted background
- **Empty state:** Centered illustration + title + description

### Responsive Behavior
- **Mobile:** Single column, cards stack vertically
- **Tablet:** 2-column grid
- **Desktop:** 3-column grid or full-width table

### Interactions
- **Card click:** Navigates to policy detail (visual only)
- **Edit action:** Only where backend support exists (currently read-only)

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Layout | N/A | Policy cards or table |
