# Page Guidelines: Workspace Settings

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Workspace Settings
> **Route:** `/settings` (mapped to `activePage === 'settings'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Two-column layout — settings sidebar (left), settings form (right)
- **Sidebar (main):** Expanded by default; active item = `settings`
- **Settings sidebar:** Secondary navigation within settings section
- **Form area:** Full width on right, card-based grouping

### Color Usage
- **Admin-only actions:** Red/destructive styling, never color-only
- **Organization mapping:** Green when active, gray when unmapped
- **Form fields:** Border `--color-border`, focus ring `--color-ring`
- **Member list:** Muted background for rows, `--color-muted-foreground` for secondary text

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`
- **Settings section title:** Plus Jakarta Sans, 600, 1rem (16px), `--color-primary`
- **Setting label:** Plus Jakarta Sans, 500, 0.875rem (14px), `--color-foreground`
- **Setting description:** Plus Jakarta Sans, 400, 0.8125rem (13px), `--color-muted-foreground`
- **Admin label:** Plus Jakarta Sans, 500, 0.75rem (12px), `--color-secondary`, uppercase, tracking-wider

### Components
- **Setting cards:** `--space-lg` padding, border `--color-border`, grouped by category
- **Toggle switches:** Primary color when on, muted when off
- **Admin badge:** Small, red-tinted, "Administrator only" label
- **Organization selector:** Select control or badge showing current org
- **Empty state:** Centered illustration + title + description

### Responsive Behavior
- **Mobile:** Single column — settings sidebar stacks above form area
- **Tablet:** Two-column layout
- **Desktop:** Two-column layout with settings sidebar fixed width

### Interactions
- **Toggle:** Immediate state change with subtle animation
- **Admin actions:** Confirmation dialog before destructive action
- **Form save:** Primary button, disabled during save, shows loading state

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Layout | N/A | Two-column settings layout |
| Admin badge | N/A | Red-tinted small badge |
