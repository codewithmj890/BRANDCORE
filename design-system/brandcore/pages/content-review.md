# Page Guidelines: Content Review

> **Source:** `design-system/brandcore/MASTER.md` (Master rules apply unless overridden below)
> **Page:** Content Review Workflow
> **Route:** `/content` (mapped to `activePage === 'content'`)

---

## Page-Specific Rules

### Layout
- **Pattern:** Two-column split layout — left column (submission form), right column (content versions + findings + review decision)
- **Sidebar:** Expanded by default; active item = `content`
- **Column split:** 1/3 left, 2/3 right on desktop; stacked on mobile
- **Max-width:** Left column constrained to `--space-xl` max-width

### Color Usage
- **Severity colors:** High severity = red, medium = amber, low = green, info = blue
- **Finding cards:** Border-left accent color matching severity
- **Review decision buttons:** Approved = green, Changes Requested = amber, Rejected = red
- **Mock mode banner:** Amber-tinted background (informational, not error)

### Typography
- **Page title:** Plus Jakarta Sans, 700, 1.5rem (24px), `--color-primary`
- **Finding title:** Plus Jakarta Sans, 600, 1rem (16px), `--color-foreground`
- **Finding explanation:** Plus Jakarta Sans, 400, 0.875rem (14px), `--color-muted-foreground`
- **Content body text:** Plus Jakarta Sans, 400, 1rem (16px), line-height 1.6, `--color-foreground`
- **Version numbers:** Plus Jakarta Sans, 500, 0.875rem (14px), font-mono fallback

### Components
- **Content submission form:** Card with `--space-lg` padding, grouped form fields
- **Finding cards:** `--space-md` padding, border-left `--space-xs` accent, hover subtle elevation
- **Review decision form:** Card with radio buttons + textarea for notes
- **Version history table:** DataTable component, row hover state, clickable rows
- **Empty state:** Centered, no hardcoded metrics

### Responsive Behavior
- **Mobile:** Single column — submission form on top, then versions, then findings, then review
- **Tablet:** Two-column split
- **Desktop:** Two-column split with left column pinned

### Interactions
- **Submit button:** Primary, disabled during submission, shows loading state
- **Review decision:** Primary button for selected decision, secondary for cancel
- **Finding cards:** Clickable to expand details (not implemented — visual only)
- **Severity badges:** Small, rounded, colored background with text

---

## Override vs Master

| Rule | Master | Page Override |
|------|--------|---------------|
| Density | 5/10 Standard | 5/10 Standard |
| Motion | 3/10 Subtle | 3/10 Subtle |
| Layout | N/A | Two-column split |
| Severity colors | N/A | Red/amber/green/blue by finding type |
