# Page Guidelines: Dashboard

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Workspace Overview / Dashboard
> **Route:** `/overview` (mapped to `activePage === 'overview'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Bento grid dashboard — cards of varying sizes arranged in a responsive CSS grid
- **Sidebar:** Expanded by default; active item = `overview`
- **Max-width:** Content constrained to `--space-3xl` padding on all sides
- **Grid:** 1 column mobile, 3 columns tablet+, 4 columns desktop+

### Color Usage
- **Primary cards:** Surface-white with subtle border; no heavy shadows
- **Status indicators:** Green for valid, amber for stale, red for revoked — never color-only
- **Metric cards:** Use `--color-muted` background for light mode, `--color-secondary` for dark mode
- **Alert cards:** Amber-tinted background for stale releases, red-tinted for facts without evidence

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-foreground`
- **Section headings:** Plus Jakarta Sans, 600, 1rem (16px), `--color-secondary`
- **Metric values:** Plus Jakarta Sans, 700, 1.875rem (30px), `--color-primary`, tabular numerals
- **Metric labels:** Plus Jakarta Sans, 400, 0.875rem (14px), `--color-muted-foreground`, uppercase, tracking-wider

### Components
- **Metric cards:** `--space-lg` padding, rounded-12px, border `--color-border`
- **Status badges:** Small, pill-shaped, status-colored with text label
- **Skeleton:** Bento grid skeletons matching card geometry
- **Quick actions:** Stacked buttons, full-width on mobile, auto-width on desktop

### Responsive Behavior
- **Mobile:** Single column bento grid, cards stack vertically
- **Tablet:** 2-column grid
- **Desktop:** 3-4 column grid for metrics, 2-column for main content areas

### Interactions
- **Metric cards:** Hover elevates shadow from `--shadow-md` to `--shadow-lg` (no translate to avoid layout shift)
- **Quick action buttons:** Primary for "Submit Content", secondary for others
- **Empty states:** Centered illustration + title + description + primary action button

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Motion | 3/10 Subtle | 3/10 Subtle |
| Variance | 4/10 Balanced | 4/10 Balanced |
| Card radius | 12px | 12px |
| Metric value size | N/A | 1.875rem (30px) |
