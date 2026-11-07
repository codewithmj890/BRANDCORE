# Page Guidelines: Release Passports

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Release Passports / Release Governance
> **Route:** `/releases` (mapped to `activePage === 'releases'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Release list with status badges, stale indicators, and drawer-based detail view
- **Sidebar:** Expanded by default; active item = `releases`
- **Table:** Full width, clickable rows opening detail drawer
- **Detail drawer:** Slide-up from bottom on mobile, slide-in from right on desktop

### Color Usage
- **Release status:** Valid = green, Stale = amber, Revoked = red, Invalid = red
- **Stale impact card:** Amber-tinted background (`--color-muted` with amber border)
- **Stale indicator:** Amber dot + "STALE" label, never color-only
- **Revalidation button:** Red/danger variant for stale releases

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`
- **Release ID:** Plus Jakarta Sans, 500, 0.9375rem (15px), font-mono, `--color-foreground`
- **Content hash:** Plus Jakarta Sans, 400, 0.8125rem (13px), font-mono, `--color-muted-foreground`
- **Table headers:** Plus Jakarta Sans, 500, 0.75rem (12px), `--color-secondary`, uppercase, tracking-wider
- **Stale reason:** Plus Jakarta Sans, 400, 0.875rem (14px), `--color-foreground`

### Components
- **Data table:** Full-width, border `--color-border`, row hover `--color-muted`, clickable rows
- **Status badge:** Small, pill-shaped, status-colored
- **Detail drawer:** `--shadow-lg`, rounded-t-lg on desktop, full-height on mobile
- **Stale impact card:** Amber border, amber-tinted background, structured key-value pairs
- **Empty state:** Centered illustration + title + description

### Responsive Behavior
- **Mobile:** Table scrolls horizontally, detail drawer full-height slide-up
- **Tablet:** Table full width, detail drawer slide-in from right
- **Desktop:** Table full width, detail drawer slide-in from right (max-width `--space-2xl`)

### Interactions
- **Row click:** Opens release passport detail drawer
- **Stale button:** "Review Impact" — red/danger variant, opens stale impact section
- **Revalidation:** "Request Revalidation" — primary action on stale impact card
- **Drawer close:** Escape key, backdrop click, close button

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Layout | N/A | Table + detail drawer |
| Stale card | N/A | Amber-tinted background |
